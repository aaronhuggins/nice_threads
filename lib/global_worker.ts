import { NiceWorker } from './NiceWorker.ts';

let globalWorker: typeof NiceWorker = NiceWorker;

export function getGlobalWorker(): typeof NiceWorker {
	return globalWorker;
}

export function setGlobalWorker(workerImpl: typeof NiceWorker): void {
	globalWorker = workerImpl;
}
