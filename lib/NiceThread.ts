import { isNiceThreadError } from './error.ts';
import { getGlobalWorker } from './global_worker.ts';
import type { NiceWorker } from './NiceWorker.ts';
import type { AwaitResult, NiceAsync } from './types.ts';

/** A promise-based web worker wrapper for easy thread creation at runtime. */
export class NiceThread<T extends NiceAsync> {
	#idCounter = 0;
	#worker: NiceWorker;

	/** Creates an instance of NiceThread with an async function for threaded work. */
	constructor(worker: T) {
		const Worker = getGlobalWorker();
		this.#worker = new Worker(worker);
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
