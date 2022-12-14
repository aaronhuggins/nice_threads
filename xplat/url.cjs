function internalBtoa(input) {
	if (typeof btoa === 'function') return btoa(input);

	const buffer = Buffer.from(input, 'binary');

	return buffer.toString('base64');
}

function normalizeNodeModule(script) {
	const importStarMatch = /await Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\((.+)\)\)\)/gu;
	const requireMatch = /require\((.+)\)/gu;
	const toFileUrl = (path) => {
		const validPackage = /^((node:){0,1}[@a-z][a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
		if (validPackage.test(path)) return path
		return 'file://' + path.split(/[\\/]/gu).map(encodeURIComponent).join('/');
	};
	const resolver = (_matched, $1) => {
		const specMatch = (/^['"](.+)['"]$/gu);

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

		return `await import(${$1})`;
	};

	return script.replace(importStarMatch, resolver).replace(requireMatch, resolver);
}

module.exports.makeUrl = function makeUrl(script) {
	const mimetype = 'text/javascript';
	return `data:${mimetype};base64,${internalBtoa(normalizeNodeModule(script))}`;
};
