// deno-lint-ignore-file no-explicit-any
import { isNiceThreadError } from './error.ts';
import { makeUrl } from './url.ts';

export class NiceThreadPool<T extends NiceAsync> extends Array<Promise<Awaited<ReturnType<T>>>> {
	#last = 0;
	#poolSize = 2;
	#pool: Worker[] = [];
	#script: string;

	constructor(worker: T) {
		super();
		const script = 'const worker = ' + worker.toString() + ';\n' +
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

	get poolSize() {
		return this.#poolSize;
	}

	set poolSize(value: number) {
		this.#poolSize = value;
	}

	call(...args: Parameters<T>) {
		const id = this.length;
		const worker = this.#nextWorker();
		const promise = new Promise<any>((resolve, reject) => {
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

	all(): Promise<Awaited<ReturnType<T>>[]>;
	all(calls: Parameters<T>[]): Promise<Awaited<ReturnType<T>>[]>;
	all(calls?: Parameters<T>[]): Promise<Awaited<ReturnType<T>>[]> {
		if (Array.isArray(calls)) return Promise.all(calls.map((args) => this.call(...args)));

		return Promise.all(this) as any;
	}

	allSettled(): Promise<PromiseSettledResult<Awaited<ReturnType<T>>>[]>;
	allSettled(calls: Parameters<T>[]): Promise<PromiseSettledResult<Awaited<ReturnType<T>>>[]>;
	allSettled(calls?: Parameters<T>[]): Promise<PromiseSettledResult<Awaited<ReturnType<T>>>[]> {
		if (Array.isArray(calls)) return Promise.allSettled(calls.map((args) => this.call(...args)));

		return Promise.allSettled(this) as any;
	}

	clear() {
		this.length = 0;
	}

	terminate(): void;
	terminate(clear: true): void;
	terminate(clear = false) {
		for (const worker of this.#pool) worker.terminate();
		this.#pool = [];
		this.#last = 0;
		if (clear) this.clear();
	}
}

export type NiceAsync<Params extends any[] = any[], Result = any> = (...args: Params) => Promise<Result>;
