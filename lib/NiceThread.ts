import { isNiceThreadError } from './error.ts';
import type { AwaitResult, NiceAsync } from './types.ts';
import { makeUrl } from './url.ts';

/** A promise-based web worker wrapper for easy thread creation at runtime. */
export class NiceThread<T extends NiceAsync> {
	#idCounter = 0;
	#worker: Worker;

	/** Creates an instance of NiceThread with an async function for threaded work. */
	constructor(worker: T) {
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
		// deno-lint-ignore no-explicit-any
		this.#worker = new Worker(makeUrl(script), { type: 'module' } as any);
	}

	/** Calls the function on the thread and returns a promise which will contain the result. */
	call(...args: Parameters<T>): Promise<AwaitResult<T>> {
		const id = this.#idCounter++;
		const promise = new Promise<AwaitResult<T>>((resolve, reject) => {
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
						resolve(event.data.result as AwaitResult<T>);
					}
				}
			};
			const onmessageerror = (event: MessageEvent) => {
				remove();
				reject(event.data);
			};
			const remove = () => {
				this.#worker.removeEventListener('error', onerror);
				this.#worker.removeEventListener('message', onmessage);
				this.#worker.removeEventListener('messageerror', onmessageerror);
			};

			this.#worker.addEventListener('error', onerror);
			this.#worker.addEventListener('message', onmessage);
			this.#worker.addEventListener('messageerror', onmessageerror);
		});

		this.#worker.postMessage({ id, args });

		return promise;
	}

	/** Terminates the thread and any pending work. */
	terminate() {
		this.#worker.terminate();
	}

	get [Symbol.toStringTag](): string {
		return 'NiceThread';
	}
}
