import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { NiceThreadPool } from './NiceThreadPool.ts';

describe('NiceThreadPool', () => {
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

		pool.call(30);
		pool.call(100);
		pool.call(150);
		pool.call(60);

		const result = await pool.all();

		pool.terminate();

		assert(Array.isArray(pool));
		assertEquals(pool.length, 4);

		pool.clear();

		assertEquals(pool.length, 0);
		assertEquals(result.length, 4);
	});
});
