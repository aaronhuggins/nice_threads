export function makeUrl(script: string): string {
	const mimetype = 'text/javascript';
	return URL.createObjectURL(new Blob([script], { type: mimetype }));
}
