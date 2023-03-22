// deno-lint-ignore-file no-explicit-any
import { isNiceThreadError } from './error.ts';
import type { NiceAsync } from "./types.ts";
import { makeUrl } from './url.ts';

export class NiceThreadPool<T extends NiceAsync> extends Array<Promise<Awaited<ReturnType<T>>>> {
	#last = 0;
	#poolSize = 2;
	#pool: Worker[] = [];
	#script: string;

	constructor(worker: T) {
		super();
		const script = 'const workerCache = new Map();\n' +
			'const worker = ' + worker.toString() + ';\n' +
			'addEventListener("message", function (event) {\n' +
			'  const workerData = event.data ?? { id: 0, args: [] };\n' +
			'  const { id = 0, args = [] } = workerData\n' +
			'  worker(...args)\n' +
			'    .then(\n' +
			'      function (result) {\n' +
			'        postMessage({ id, result })\n' +
			'      },\n' +
			'      function (error) {\n' +
			'        postMessage({ id, __nice_thread_error: error })\n' +
			'      }\n' +
			'    )\n' +
			'})';
		this.#script = makeUrl(script);
	}

	#nextWorker() {
		if (this.#last === this.#poolSize) this.#last = 0;

		const current = this.#last++;
		const worker = this.#pool[current] ?? new Worker(this.#script, { type: 'module' } as any);
		this.#pool[current] = worker;

		return worker;
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
	call(...args: Parameters<T>) {
		const id = this.length;
		const worker = this.#nextWorker();
		const promise = new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
			const onerror = (event: ErrorEvent) => {
				remove();
				reject(event.error);
			};
			const onmessage = (event: MessageEvent) => {
				if (event.data?.id === id) {
					remove();
					if (isNiceThreadError(event.data)) {
						reject(event.data.__nice_thread_error);
					} else {
						resolve(event.data.result);
					}
				}
			};
			const onmessageerror = (event: MessageEvent) => {
				remove();
				reject(event.data);
			};
			const remove = () => {
				worker.removeEventListener('error', onerror);
				worker.removeEventListener('message', onmessage);
				worker.removeEventListener('messageerror', onmessageerror);
			};

			worker.addEventListener('error', onerror);
			worker.addEventListener('message', onmessage);
			worker.addEventListener('messageerror', onmessageerror);
		});

		this.push(promise);

		worker.postMessage({ id, args });

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
		for (const worker of this.#pool) worker.terminate();
		this.#pool = [];
		this.#last = 0;
		if (clear) this.clear();
	}
}
