# Nice Threads

A promise wrapper for JavaScript Workers, batteries included for Deno and Node.

# Usage

Import using Deno, Node CJS, or Node ESM.

Then, you can start individual threads and manage them yourself:

```TypeScript
const niceThread = new NiceThread<string, number>(function (resolve, reject) {
	// Example only. Typically, you want some big work to do off the main thread.
	try {
		resolve(this.workerData.toString());
	} catch (error) {
		reject(error);
	}
});

const result = await niceThread.putWork(10); // Expected: '10'
```

Or use the provided round-robin thread pool:

```TypeScript
const pool = new NiceThreadPool(async (size: number): string => {
	const myImport = await import('some_import');
	return await myImport(size);
});

pool.poolSize = 6;

const results = await pool.all(Array.from({ length: 20 }, () => 2048));
```

For complete details of the library, please see the hosted documentation (coming soon).
