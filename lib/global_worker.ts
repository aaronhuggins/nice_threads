import { NiceWorker } from './NiceWorker.ts';

let globalWorker: typeof NiceWorker = NiceWorker;

// deno-lint-ignore no-explicit-any
function isLikeNiceWorker(input: any): input is typeof NiceWorker {
	return typeof input?.prototype === 'object' && Object.hasOwn(input?.prototype, 'postMessage') &&
		Object.hasOwn(input?.prototype, 'addEventListener') && Object.hasOwn(input?.prototype, 'removeEventListener') &&
		Object.hasOwn(input?.prototype, 'terminate');
}

export function getGlobalWorker(): typeof NiceWorker {
	return globalWorker;
}

export function setGlobalWorker(workerImpl: typeof NiceWorker): void {
	if (isLikeNiceWorker(workerImpl)) {
		globalWorker = workerImpl;
		return;
	}

	throw new TypeError('Function setGlobalWorker: type of input is not suficiently like NiceWorker');
}
