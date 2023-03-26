import { assertEquals } from 'https://deno.land/std@0.150.0/testing/asserts.ts';
import { describe, it } from 'https://deno.land/x/deno_mocha@0.3.0/mod.ts';
import { mock, unmock } from './mock.ts';

function assertNotMocked(): void {
	// deno-lint-ignore no-explicit-any
	assertEquals((globalThis as any).workerCache, undefined);
}

describe('mock', () => {
	it('should mock and unmock', () => {
		assertNotMocked();
		mock();
		// deno-lint-ignore no-explicit-any
		assertEquals((globalThis as any).workerCache instanceof Map, true);
		unmock();
		assertNotMocked();
	});
});
