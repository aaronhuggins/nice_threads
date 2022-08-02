import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { assert } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { isNiceThreadError } from './error.ts';

describe('error', () => {
	it('is a NiceThreadError object', () => {
		assert(!isNiceThreadError({ nope: 1 }));
		assert(isNiceThreadError({ __nice_thread_error: undefined }));
	});
});
