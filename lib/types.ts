declare global {
	// deno-lint-ignore no-explicit-any
	const workerCache: Map<any, any>
}

// deno-lint-ignore no-explicit-any
export type NiceAsync<Params extends any[] = any[], Result = any> = (...args: Params) => Promise<Result>;
