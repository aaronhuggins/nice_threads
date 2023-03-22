# Nice Threads

A promise wrapper for JavaScript Workers, batteries included for Deno and Node.

## Usage

Import using Deno, Node CJS `require`, or Node ESM `import`.

All executors and workers are of type `module`; use `await import` to dynamically import other modules at runtime.

Then, you can start individual threads and manage them yourself:

```TypeScript
const niceThread = new NiceThread(async function (input) {
	// Example only. Typically, you want some big work to do off the main thread.
	return input
});

const result = await niceThread.call(10); // Expected: '10'
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

For complete details of the library, please see [the hosted documentation](https://deno.land/x/nice_threads/mod.ts).
In-line code examples will be added before a major version release.

## Fixes old lib Promise Workers

This code base is a refactor of [the promise-workers library](https://github.com/aaronhuggins/promise-workers). Nice
Threads has a better name, and works in Node and Deno.

Most features of Promise Workers will be deprecated. A list of feature parity and reasoning will be forthcoming. The
main driver is that Promise Workers was written with a lot of assumptions regarding Node 12 that no longer apply,
and had major compatibility issues with Workers in Web and Deno. It was easier to get a clean break than to treat it
as a new version of Promise Workers.
