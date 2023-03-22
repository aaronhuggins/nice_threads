// deno-lint-ignore-file no-explicit-any
import { isNiceThreadError } from '../error.ts';
import { makeUrl } from '../url.ts';

/**
 * Legacy web worker wrapper class; poor API, bad re-implementation of Promise.
 * @deprecated Will be removed in a major release; no longer maintained.
 */
export class NiceThread<T = unknown, I = any> {
	#persist = false;
	#worker: Worker;
	#promise: Promise<T>;

	/** @deprecated Will be removed in a major release; no longer maintained. */
	constructor(
		executor: (
			this: { workerData: I },
			resolve: (value: T | PromiseLike<T>) => void,
			reject: (reason?: any) => void,
		) => void,
	) {
		const script = 'const executor = ' + executor.toString() + '\n' +
			'addEventListener("message", function (event) {\n' +
			'  const workerData = event.data\n' +
			'  new Promise(executor.bind({ workerData }))\n' +
			'    .then(\n' +
			'      function (result) {\n' +
			'        postMessage(result)\n' +
			'      },\n' +
			'      function (error) {\n' +
			'        postMessage({ __nice_thread_error: error })\n' +
			'      }\n' +
			'    )\n' +
			'})';
		const url = makeUrl(script);
		this.#worker = new Worker(url, { type: 'module' });
		this.#promise = this.#newPromise();
	}

	#newPromise() {
		return new Promise<T>((resolve, reject) => {
			this.#worker.onmessage = (event: MessageEvent) => {
				this.#terminate();
				if (isNiceThreadError(event.data)) {
					reject(event.data.__nice_thread_error);
				} else {
					resolve(event.data);
				}
			};
			this.#worker.onerror = (event: ErrorEvent) => {
				this.#terminate();
				reject(event.error);
			};
			this.#worker.onmessageerror = (event: MessageEvent) => {
				this.#terminate();
				reject(event.data);
			};
		});
	}

	#terminate() {
		if (this.#persist) {
			this.#promise = this.#newPromise();
		} else {
			this.#worker.terminate();
		}
	}

	get persist() {
		return this.#persist;
	}

	set persist(value: boolean) {
		this.#persist = value;
	}

	putWork(workerData: I) {
		this.#worker.postMessage(workerData);
		return this;
	}

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): Promise<TResult1 | TResult2> {
		return this.#promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
	): Promise<T | TResult> {
		return this.#promise.catch(onrejected);
	}

	finally(onfinally?: (() => void) | null | undefined): Promise<T> {
		return this.#promise.finally(onfinally);
	}

	get [Symbol.toStringTag](): string {
		return 'NiceThread';
	}
}
