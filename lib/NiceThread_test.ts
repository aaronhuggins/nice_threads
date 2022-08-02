import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { NiceThread } from './NiceThread.ts';

declare const workerData: number;

describe('NiceThread', () => {
	it('should create thread and run as promise', async () => {
		const result = await new NiceThread<number[], number>(function (resolve) {
			const max = this.workerData;
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
			resolve(primes);
		}).putWork(100);
		assert(Array.isArray(result));
		assertEquals(result.length, 25);
	});
});
