import { assertEquals, assertObjectMatch } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { mock, unmock } from './mock.ts';
import { MockWorker } from './MockWorker.ts';
import { NiceThread } from './NiceThread.ts';

function assertNotMocked(): void {
	// deno-lint-ignore no-explicit-any
	assertEquals((globalThis as any).workerCache, undefined);
}

describe('MockWorker', () => {
	it('should simulate NiceWorker', async () => {
		const worker = async (input: 'pass' | 'error') => {
			if (input === 'error') {
				throw new Error(input);
			}

			return await input;
		};

		assertNotMocked();
		const thread = new NiceThread(worker);
		const expected1 = await thread.call('pass');
		const expected2 = await thread.call('error').catch((error) => error?.message as 'error');

		thread.terminate();

		mock();
		const mocked = new NiceThread(worker);
		const actual1 = await mocked.call('pass');
		const actual2 = await mocked.call('error').catch((error) => error?.message as 'error');

		mocked.terminate();
		unmock();
		assertNotMocked();

		assertEquals(actual1, expected1);
		assertEquals(actual2, expected2);
	});

	it('should simulate NiceWorker with sync function', async () => {
		// Pretend that a synchronous function is "async";
		// this could really happen in consumers of the library.
		const worker = (input: 'pass' | 'error'): Promise<'pass'> => {
			if (input === 'error') {
				const error = workerCache.get(input) ?? new Error(input);
				workerCache.set(input, error);
				throw error;
			}

			return input as unknown as Promise<'pass'>;
		};

		assertNotMocked();
		const thread = new NiceThread(worker);
		const expected1 = await thread.call('pass');
		const expected2 = await thread.call('error').catch((error) => error?.message as 'error');
		const expected3 = await thread.call('error').catch((error) => error?.message as 'error');

		thread.terminate();

		mock();
		const mocked = new NiceThread(worker);
		const actual1 = await mocked.call('pass');
		const actual2 = await mocked.call('error').catch((error) => error?.message as 'error');
		const actual3 = await mocked.call('error').catch((error) => error?.message as 'error');

		mocked.terminate();
		unmock();
		assertNotMocked();

		assertEquals(actual1, expected1);
		assertEquals(actual2, expected2);
		assertEquals(actual3, expected3);
	});

	it('should handle listener objects', async () => {
		const worker = new MockWorker(async (input: string) => await input);
		const promise = new Promise<string>((resolve) => {
			const listener = {
				handleEvent(event: MessageEvent) {
					worker.removeEventListener('message', listener);
					resolve(event.data.result);
				},
			};
			worker.addEventListener('message', listener);
			worker.postMessage({ args: ['test'] });
		});
		assertEquals(await promise, 'test');
	});

	it('should handle arbitrary values', async () => {
		const worker = new MockWorker(async (input: string) => await input);
		// deno-lint-ignore no-explicit-any
		const getPromise = (input?: { id?: number; args?: any[] }) => {
			// deno-lint-ignore no-explicit-any
			return new Promise<{ id: number; result: any }>((resolve) => {
				const listener = {
					handleEvent(event: MessageEvent) {
						worker.removeEventListener('message', listener);
						resolve(event.data);
					},
				};
				worker.addEventListener('message', listener);
				worker.postMessage({ ...input });
			});
		};
		assertObjectMatch(await getPromise(), { id: 0 });
		assertObjectMatch(await getPromise({ id: 22 }), { id: 22 });
		assertObjectMatch(await getPromise({ args: [22] }), { id: 0, result: 22 });
	});

	it('should error on unserializable input', async () => {
		const worker = new MockWorker(async (input: string) => await input);
		// deno-lint-ignore no-explicit-any
		const getPromise = (input?: any) => {
			// deno-lint-ignore no-explicit-any
			return new Promise<any>((resolve) => {
				const listener = {
					handleEvent(event: MessageEvent) {
						worker.removeEventListener('message', listener);
						resolve(event.data);
					},
				};
				worker.addEventListener('messageerror', listener);
				worker.postMessage(input);
			});
		};
		assertEquals((await getPromise(function a() {})).message, 'function a() {} could not be cloned.');
	});
});
