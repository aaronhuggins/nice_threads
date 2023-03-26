import { isNiceThreadError } from './error.ts';
import { MockWorker } from './MockWorker.ts';
import { NiceWorker } from './NiceWorker.ts';
import type { AwaitResult, NiceAsync } from './types.ts';

let workerClass: typeof NiceWorker = NiceWorker;

/** A promise-based web worker wrapper for easy thread creation at runtime. */
export class NiceThread<T extends NiceAsync> {
	#idCounter = 0;
	#worker: NiceWorker;

	/** Creates an instance of NiceThread with an async function for threaded work. */
	constructor(worker: T) {
		this.#worker = new workerClass(worker);
	}

	/** Calls the function on the thread and returns a promise which will contain the result. */
	call(...args: Parameters<T>): Promise<AwaitResult<T>> {
		const id = this.#idCounter++;
		const promise = new Promise<AwaitResult<T>>((resolve, reject) => {
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
				this.#worker.removeEventListener('message', onmessage);
				this.#worker.removeEventListener('messageerror', onmessageerror);
			};

			this.#worker.addEventListener('message', onmessage);
			this.#worker.addEventListener('messageerror', onmessageerror);

			try {
				this.#worker.postMessage({ id, args });
			} catch (error) {
				reject(error);
			}
		});

		return promise;
	}

	/** Terminates the thread and any pending work. */
	terminate() {
		this.#worker.terminate();
	}

	get [Symbol.toStringTag](): string {
		return 'NiceThread';
	}

	static setWorkerClass(workerImpl: typeof NiceWorker | typeof MockWorker): void {
		if (workerImpl === NiceWorker || workerImpl === MockWorker) {
			workerClass = workerImpl;
			return;
		}
		throw new TypeError('Function setWorkerClass: type of input is not NiceWorker or MockWorker.');
	}
}
