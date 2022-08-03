// deno-lint-ignore-file no-var no-explicit-any
declare var process: any;
declare var btoa: any;
declare var Buffer: any;

function internalBtoa(input: string): string {
	if (typeof btoa === 'function') return btoa(input);

	const buffer = Buffer.from(input, 'binary');

	return buffer.toString('base64');
}

function normalizeNodeModule(script: string): string {
	const importStarMatch = /await Promise\.resolve\(\)\.then\(\(\) => __importStar\(require\((.+)\)\)\)/gu;
	const requireMatch = /require\((.+)\)/gu;
	const trueImport = 'await import($1)';

	return script.replaceAll(importStarMatch, trueImport).replaceAll(requireMatch, trueImport);
}

export function makeUrl(script: string): string {
	const mimetype = 'text/javascript';
	if (typeof process === 'object' && typeof process?.versions?.node === 'string') {
		return `data:${mimetype};base64,${internalBtoa(normalizeNodeModule(script))}`;
	} else {
		return URL.createObjectURL(new Blob([script], { type: mimetype }));
	}
}
