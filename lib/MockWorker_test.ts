import { assertEquals } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { mock, MockWorker, unmock } from './MockWorker.ts';
import { getGlobalWorker } from './global_worker.ts';
import { NiceWorker } from './NiceWorker.ts';
import { NiceThread } from './NiceThread.ts';

function assertNotMocked(): void {
	// deno-lint-ignore no-explicit-any
	assertEquals((globalThis as any).workerCache, undefined);
	assertEquals(getGlobalWorker(), NiceWorker);
}

describe('MockWorker', () => {
	it('should mock and unmock', () => {
		assertNotMocked();
		mock();
		// deno-lint-ignore no-explicit-any
		assertEquals((globalThis as any).workerCache instanceof Map, true);
		assertEquals(getGlobalWorker(), MockWorker);
		unmock();
		assertNotMocked();
	});

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
});
