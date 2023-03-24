import type { NiceAsync } from './types.ts';
import { makeUrl } from './url.ts';

export class NiceWorker {
	#worker?: Worker;

	constructor(worker: NiceAsync) {
		const script = 'const workerCache = new Map();\n' +
			'const worker = ' + worker.toString() + ';\n' +
			'addEventListener("message", async function (event) {\n' +
			'  const workerData = event.data ?? { id: 0, args: [] };\n' +
			'  const { id = 0, args = [] } = workerData\n' +
			'  try{\n' +
			'    const result = await worker(...args);\n' +
			'    postMessage({ id, result });\n' +
			'  } catch (error) {\n' +
			'    postMessage({ id, __nice_thread_error: error })\n' +
			'  }\n' +
			'})';
		// deno-lint-ignore no-explicit-any
		this.#worker = new Worker(makeUrl(script), { type: 'module' } as any);
	}

	// deno-lint-ignore no-explicit-any
	postMessage(message: any): void {
		this.#worker?.postMessage(message);
	}

	addEventListener<K extends keyof WorkerEventMap>(
		type: K,
		// deno-lint-ignore no-explicit-any
		listener: (this: Worker, ev: WorkerEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void {
		this.#worker?.addEventListener(type, listener, options);
	}

	removeEventListener<K extends keyof WorkerEventMap>(
		type: K,
		// deno-lint-ignore no-explicit-any
		listener: (this: Worker, ev: WorkerEventMap[K]) => any,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	): void {
		this.#worker?.removeEventListener(type, listener, options);
	}

	terminate(): void {
		this.#worker?.terminate();
	}
}
