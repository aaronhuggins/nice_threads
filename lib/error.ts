// deno-lint-ignore-file no-explicit-any
export type NiceThreadError = { __nice_thread_error: any };

export function isNiceThreadError(error: any): error is NiceThreadError {
	return typeof error === 'object' && error !== null && '__nice_thread_error' in error;
}
