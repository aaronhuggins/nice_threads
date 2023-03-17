import { parse, ParseOptions } from 'https://deno.land/std@0.133.0/flags/mod.ts';
import { inc as increment } from 'https://deno.land/x/semver@v1.4.0/mod.ts';
import { build, emptyDir } from 'https://deno.land/x/dnt@0.29.1/mod.ts';

await emptyDir('./npm');

function versionHandler(): string {
	switch (true) {
		case args.major:
			return increment(version, 'major') ?? version;
		case args.minor:
			return increment(version, 'minor') ?? version;
		case args.patch:
			return increment(version, 'patch') ?? version;
		case args.premajor:
			return increment(version, 'premajor') ?? version;
		case args.preminor:
			return increment(version, 'preminor') ?? version;
		case args.prepatch:
			return increment(version, 'prepatch') ?? version;
		case args.prerelease:
			return increment(version, 'prerelease') ?? version;
	}

	return version;
}

const versionFile = './.version';
const version = await Deno.readTextFile(versionFile);
const argsOpts: ParseOptions = {
	boolean: true,
	default: {
		major: false,
		minor: false,
		patch: false,
		premajor: false,
		preminor: false,
		prepatch: false,
		prerelease: false,
	},
};
const args = parse(Deno.args, argsOpts);
const newVersion = versionHandler();

await build({
	entryPoints: ['./mod.ts'],
	outDir: './npm',
	typeCheck: false,
	compilerOptions: {
		lib: ['es2022', 'webworker'],
		target: 'ES2020',
	},
	shims: {
		blob: true,
		deno: true,
		custom: [
			{
				package: {
					name: 'web-worker',
					version: '^1.2.0',
				},
				globalNames: [{
					name: 'Worker',
					exportName: 'default',
				}],
			},
		],
	},
	postBuild: async () => {
		// await Deno.mkdir('./npm/esm/lib', { recursive: true })
		// await Deno.mkdir('./npm/script/lib', { recursive: true })
		await Deno.copyFile('./xplat/url.mjs', './npm/esm/lib/url.js');
		await Deno.copyFile('./xplat/url.cjs', './npm/script/lib/url.js');
	},
	package: {
		name: 'nice-threads',
		version: newVersion,
		description: 'A promise wrapper for JavaScript Workers, batteries',
		keywords: ['worker', 'promise', 'multithread'],
		homepage: 'https://github.com/aaronhuggins/nice_threads#readme',
		bugs: 'https://github.com/aaronhuggins/nice_threads/issues',
		license: 'MIT',
		contributors: [
			'Aaron Huggins <ahuggins@aaronhuggins.com> (https://aaronhuggins.com/)',
		],
		repository: {
			type: 'git',
			url: 'https://github.com/aaronhuggins/nice_threads.git',
		},
	},
});

// post build steps
await Deno.copyFile('LICENSE.md', 'npm/LICENSE.md');
await Deno.copyFile('README.md', 'npm/README.md');

if (newVersion === version) {
	console.log(
		`[build_npm] Version did not change; nothing to deploy. nice-threads v${version}`,
	);
} else {
	await Deno.writeTextFile(versionFile, newVersion);
	console.log(`[build_npm] nice-threads v${newVersion} ready to deploy!`);
}
