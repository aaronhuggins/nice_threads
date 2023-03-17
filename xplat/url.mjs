import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function internalBtoa(input) {
	if (typeof btoa === 'function') return btoa(input);

	const buffer = Buffer.from(input, 'binary');

	return buffer.toString('base64');
}

function normalizeNodeModule(script) {
	const importMatch = /import\((.+)\)/gu;
	const toFileUrl = (path) => {
		const validPackage = /^((node:){0,1}[@a-z][a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
		if (validPackage.test(path)) return path;
		return 'file://' + path.split(/[\\/]/gu).map(encodeURIComponent).join('/');
	};
	const resolver = (_matched, $1) => {
		const specMatch = /^['"](.+)['"]$/gu;

		if (specMatch.test($1)) {
			const spec = $1.replace(specMatch, '$1');

			if ((/^[a-z].*/gu).test(spec)) {
				try {
					$1 = `"${toFileUrl(require.resolve(spec))}"`;
				} catch (_) {
					// Silently fail on import to bubble up real worker error.
				}
			}
		}

		return `cacheImport(${$1})`;
	};

	const normalized = script.replace(importMatch, resolver);

	return 'const importCache = new Map();\n' +
		'async function cacheImport(spec) {\n' +
		'  if (importCache.has(spec)) {\n' +
		'    return importCache.get(spec);\n' +
		'  }\n' +
		'  const result = await import(spec);\n' +
		'  importCache.set(spec, result);\n' +
		'  return result;\n' +
		'};\n' + normalized;
}

export function makeUrl(script) {
	const mimetype = 'text/javascript';
	return `data:${mimetype};base64,${internalBtoa(normalizeNodeModule(script))}`;
}
