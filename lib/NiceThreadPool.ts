// deno-lint-ignore-file no-explicit-any
import { NiceThread } from './NiceThread.ts';
import type { AwaitResult, NiceAsync } from './types.ts';

export class NiceThreadPool<T extends NiceAsync> extends Array<Promise<AwaitResult<T>>> {
	#last = 0;
	#poolSize = 2;
	#pool: NiceThread<T>[] = [];
	#worker: T;

	constructor(worker: T) {
		super();
		this.#worker = worker;
	}

	#nextThread() {
		if (this.#last === this.#poolSize) this.#last = 0;

		const current = this.#last++;
		const thread = this.#pool[current] ?? new NiceThread(this.#worker);
		this.#pool[current] = thread;

		return thread;
	}

	/** An integer which determines the number of threads in the pool, no less than 1. */
	get poolSize() {
		return this.#poolSize;
	}

	/** An integer which determines the number of threads in the pool, no less than 1. */
	set poolSize(value: number) {
		this.#poolSize = Math.max(Math.floor(value), 1);
	}

	/** Make an arbitrary call to the thread pool. */
	call(...args: Parameters<T>): Promise<AwaitResult<T>> {
		const promise = this.#nextThread().call(...args);

		this.push(promise);

		return promise;
	}

	/** Queue a series of calls on the thread pool */
	queue(calls: Iterable<Parameters<T>>): this {
		for (const args of calls) this.call(...args);

		return this;
	}

	/** Resolve all calls on the thread pool. */
	all(): Promise<Awaited<ReturnType<T>>[]>;
	/** Resolve an array of calls on the thread pool. */
	all(calls: Parameters<T>[]): Promise<Awaited<ReturnType<T>>[]>;
	all(calls?: Parameters<T>[]): Promise<Awaited<ReturnType<T>>[]> {
		if (Array.isArray(calls)) return Promise.all(calls.map((args) => this.call(...args)));

		return Promise.all(this) as any;
	}

	/** Settle all calls on the thread pool. */
	allSettled(): Promise<PromiseSettledResult<Awaited<ReturnType<T>>>[]>;
	/** Settle an array of calls on the thread pool. */
	allSettled(calls: Parameters<T>[]): Promise<PromiseSettledResult<Awaited<ReturnType<T>>>[]>;
	allSettled(calls?: Parameters<T>[]): Promise<PromiseSettledResult<Awaited<ReturnType<T>>>[]> {
		if (Array.isArray(calls)) return Promise.allSettled(calls.map((args) => this.call(...args)));

		return Promise.allSettled(this) as any;
	}

	/** Clear all results from the thread pool. */
	clear() {
		this.length = 0;
	}

	/** Terminate the thread pool. */
	terminate(): void;
	/** Terminate the thread pool and clear all results. */
	terminate(clear: true): void;
	terminate(clear = false) {
		for (const thread of this.#pool) thread.terminate();
		this.#pool = [];
		this.#last = 0;
		if (clear) this.clear();
	}
}
