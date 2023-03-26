import { MockWorker } from './MockWorker.ts';
import { NiceThread } from './NiceThread.ts';
import { NiceWorker } from './NiceWorker.ts';

let mocked = false;

/** Enable mock workers for single-threaded testing and validation. Use mocking for accurate debug traces and code coverage. */
export function mock(): void {
	if (!mocked) {
		mocked = true;
		// deno-lint-ignore no-explicit-any
		(globalThis as any).workerCache = new Map<any, any>();
		NiceThread.setWorkerClass(MockWorker);
	}
}

/** Disable mock workers for real multi-threaded validation. Running unmocked code is a reliable integration test. */
export function unmock(): void {
	if (mocked) {
		NiceThread.setWorkerClass(NiceWorker);
		// deno-lint-ignore no-explicit-any
		delete (globalThis as any).workerCache;
		mocked = false;
	}
}
