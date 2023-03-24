import { assertEquals, assertThrows } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { getGlobalWorker, setGlobalWorker } from './global_worker.ts';
import { MockWorker } from './MockWorker.ts';
import { NiceWorker } from './NiceWorker.ts';

describe('Global Worker', () => {
	it('should get worker', () => {
		const worker = getGlobalWorker();

		assertEquals(worker, NiceWorker);
	});

	it('should set worker', () => {
		const worker = getGlobalWorker();

		setGlobalWorker(MockWorker);

		const result = getGlobalWorker();

		setGlobalWorker(worker);

		assertEquals(result, MockWorker);
	});

	it('should error when not like NiceWorker', () => {
		assertThrows(() => {
			setGlobalWorker({} as unknown as typeof NiceWorker);
		});
	});
});
