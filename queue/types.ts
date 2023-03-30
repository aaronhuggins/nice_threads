export type QueueInputBase<Category extends string, Commands extends string> = {
	category: Category;
	command: Commands;
};

export type QueueInitInput = QueueInputBase<'QUEUE', 'INIT' | 'TERMINATE'> & {
	name: string;
};

export type QueueJobInput = QueueInputBase<'JOB', 'ADD' | 'REMOVE'> & {
	name: string;
	// deno-lint-ignore no-explicit-any
	data: any;
};

export type QueueWorkerInput = QueueInputBase<'WORKER', 'SUBSCRIBE' | 'UNSUBSCRIBE'> & {
	name: string;
};

// deno-lint-ignore no-explicit-any
export type Job<Data = any, ReturnValue = any, Name extends string = string> = {
	name: Name;
	data: Data;
	returnvalue: ReturnValue;
};
