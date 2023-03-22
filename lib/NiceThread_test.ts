import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { NiceThread } from './NiceThread.ts';

describe('NiceThread', () => {
	it('should handle work with no errors', async () => {
		const thread = new NiceThread((max: number) => {
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

		const promise1 = thread.call(300);
		const promise2 = thread.call(1000);
		const promise3 = thread.call(1500);
		const promise4 = thread.call(600);
		const result1 = await promise1;
		const result2 = await promise2;
		const result3 = await promise3;
		const result4 = await promise4;

		thread.terminate();

		assert(Array.isArray(result1));
		assert(Array.isArray(result2));
		assert(Array.isArray(result3));
		assert(Array.isArray(result4));
	});

	it('should handle work with errors', async () => {
		const thread = new NiceThread((errNo: number) => {
			throw new Error(`${errNo}`);
		});

		const promise1 = thread.call(300).catch((err) => err);
		const promise2 = thread.call(1000).catch((err) => err);
		const promise3 = thread.call(1500).catch((err) => err);
		const promise4 = thread.call(600).catch((err) => err);
		const result1 = await promise1;
		const result2 = await promise2;
		const result3 = await promise3;
		const result4 = await promise4;

		thread.terminate();

		assert(result1 instanceof Error);
		assertEquals(result1.message, '300');
		assert(result2 instanceof Error);
		assertEquals(result2.message, '1000');
		assert(result3 instanceof Error);
		assertEquals(result3.message, '1500');
		assert(result4 instanceof Error);
		assertEquals(result4.message, '600');
	});

	it('should be an object of NiceThread', () => {
		const thread = new NiceThread(async () => {});
		thread.terminate();

		assertEquals(Object.prototype.toString.call(thread), '[object NiceThread]');
	});
});
