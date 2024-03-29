// deno-lint-ignore-file no-explicit-any
import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { NiceThreadPool } from './NiceThreadPool.ts';

declare const process: any;

describe('NiceThreadPool', () => {
	it('should set pool size to an integer', () => {
		const pool = new NiceThreadPool(async () => {});

		assertEquals(pool.poolSize, 2);

		pool.poolSize = 4;

		assertEquals(pool.poolSize, 4);

		pool.poolSize = 3.8;

		assertEquals(pool.poolSize, 3);
	});

	it('should create pool and run work on threads', async () => {
		const pool = new NiceThreadPool((max: number) => {
			const sieve = [];
			const primes = [];
			for (let i = 2; i <= max; ++i) {
				if (!sieve[i]) {
					// i has not been marked -- it is prime
					primes.push(i);
					for (let j = i << 1; j <= max; j += i) {
						sieve[j] = true;
					}
				}
			}
			return Promise.resolve(primes);
		});

		pool.call(300);
		pool.call(1000);
		pool.call(1500);
		pool.call(600);

		const result = await pool.all();

		pool.terminate();

		assert(Array.isArray(pool));
		assertEquals(pool.length, 4);

		pool.clear();

		assertEquals(pool.length, 0);
		assertEquals(result.length, 4);
		assertEquals(result[0][1], 3);
		assertEquals(result[1][1], 3);
		assertEquals(result[2][1], 3);
		assertEquals(result[3][1], 3);

		await pool.all([
			[300],
			[1000],
			[1500],
			[600],
		]);

		assertEquals(pool.length, 4);

		pool.terminate(true);

		pool.call(300);
		pool.call(1000);
		pool.call(1500);
		pool.call(600);

		await pool.allSettled();

		assertEquals(pool.length, 4);

		pool.terminate(true);

		await pool.allSettled([
			[300],
			[1000],
			[1500],
			[600],
		]);

		assertEquals(pool.length, 4);

		pool.terminate(true);
	});

	it('should execute dynamic imports in Deno and Node', async () => {
		const pool = new NiceThreadPool(async (error: any, baseUrl: string) => {
			const isNodeJs = typeof process === 'object';
			const modulePath = new URL(`./error.${isNodeJs ? 'js' : 'ts'}`, baseUrl).href;
			const { isNiceThreadError } = await import(modulePath);
			if (isNodeJs) {
				await import('web-worker' as string);
				await import('http' as string);
			}
			const { isNiceThreadError: secondary } = await import(modulePath);
			if (secondary !== isNiceThreadError) {
				throw new Error(`Secondary import of ${modulePath} did not match.`);
			}
			return isNiceThreadError(error) as boolean;
		});

		const work: [any, string][] = [
			[1, import.meta.url],
			[false, import.meta.url],
			[{ __nice_thread_error: 'actual' }, import.meta.url],
		];

		for await (const result of pool.queue(work)) {
			assertEquals(typeof result, 'boolean');
		}

		pool.terminate(true);
	});

	it('should be an object of NiceThreadPool', () => {
		const thread = new NiceThreadPool(async () => {});

		assertEquals(Object.prototype.toString.call(thread), '[object NiceThreadPool]');
	});
});
