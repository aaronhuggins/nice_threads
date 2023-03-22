let globalWorker: typeof Worker = Worker;

export function getGlobalWorker(): typeof Worker {
	return globalWorker;
}

export function setGlobalWorker(workerImpl: typeof Worker): void {
	globalWorker = workerImpl;
}
