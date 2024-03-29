import type { NiceWorker } from './NiceWorker.ts';
import type { NiceAsync } from './types.ts';

/** A mock Web Worker interface, useful for testing threads. */
export class MockWorker implements NiceWorker {
	#events = new Map<string, Set<EventListenerOrEventListenerObject>>();
	#worker: NiceAsync;
	#promises = new Set<Promise<void>>();

	constructor(worker: NiceAsync) {
		this.#worker = worker;
	}

	// deno-lint-ignore no-explicit-any
	async #callListener(listener: EventListenerOrEventListenerObject, type: keyof WorkerEventMap, data: any) {
		const event = new MessageEvent(type, { data });
		if (typeof listener === 'function') {
			return await listener(event);
		}
		return await listener.handleEvent(event);
	}

	// deno-lint-ignore no-explicit-any
	#emit(type: keyof WorkerEventMap, data: any) {
		const listeners = this.#events.get(type);
		if (listeners) {
			for (const listener of listeners) {
				this.#callListener(listener, type, data);
			}
		}
	}

	// deno-lint-ignore no-explicit-any
	postMessage(message: any): void {
		try {
			const workerData = structuredClone?.(message) ?? message;
			const { id = 0, args = [] } = workerData ?? {};
			const promise = new Promise<void>((resolve) => {
				try {
					Promise.resolve(this.#worker(...args)).then((result) => {
						this.#emit('message', { id, result });
						this.#promises.delete(promise);
						resolve();
					}, (error) => {
						this.#emit('message', { id, __nice_thread_error: error });
						this.#promises.delete(promise);
						resolve();
					});
				} catch (error) {
					// If a synchronous function is passed and errors, a race condition occurs.
					// Pretend to be asynchronous by scheduling resolution forthe future.
					setTimeout(() => {
						this.#emit('message', { id, __nice_thread_error: error });
						if (typeof promise !== 'undefined') {
							this.#promises.delete(promise);
						}
						resolve();
					}, 0);
				}
			});
			this.#promises.add(promise);
		} catch (error) {
			this.#emit('messageerror', error);
		}
	}

	addEventListener<K extends keyof WorkerEventMap>(
		type: K,
		// deno-lint-ignore no-explicit-any
		listener: (this: Worker, ev: WorkerEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions | undefined,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions | undefined,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		_options?: boolean | AddEventListenerOptions | undefined,
	): void {
		const listeners = this.#events.get(type) ?? new Set();

		listeners.add(listener);

		this.#events.set(type, listeners);
	}

	removeEventListener<K extends keyof WorkerEventMap>(
		type: K,
		// deno-lint-ignore no-explicit-any
		listener: (this: Worker, ev: WorkerEventMap[K]) => any,
		options?: boolean | EventListenerOptions | undefined,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions | undefined,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		_options?: boolean | EventListenerOptions | undefined,
	): void {
		const listeners = this.#events.get(type);
		if (listeners) {
			listeners.delete(listener);
		}
	}

	terminate(): void {}
}
