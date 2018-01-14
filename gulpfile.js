'use strict';

const es = require('event-stream');
const filter = require('gulp-filter');
const glob = require('glob');
const gulp = require('gulp');
const gulptslint = require('gulp-tslint');
const path = require('path');
const rimraf = require('rimraf');
const sourcemaps = require('gulp-sourcemaps');
const tsb = require('gulp-tsb');
const vfs = require('vinyl-fs');

const extensionsPath = path.dirname(__dirname);

const compilations = glob.sync('**/tsconfig.json', {
	cwd: extensionsPath,
	ignore: ['**/out/**', '**/node_modules/**']
});

const tasks = compilations.map(function (tsconfigFile) {
	const absolutePath = path.join(extensionsPath, tsconfigFile);
	const relativeDirname = path.dirname(tsconfigFile);

	const tsOptions = require(absolutePath).compilerOptions;
	tsOptions.verbose = false;
	tsOptions.sourceMap = true;

	const name = relativeDirname.replace(/\//g, '-');

	// Tasks
	const clean = 'clean-extension:' + name;
	const tslint = 'tslint-extension:' + name;
	const compile = 'compile-extension:' + name;
	const watch = 'watch-extension:' + name;

	const srcBase = 'src';
	const src = path.join(srcBase, '**');
	const out = 'out';

	function createPipeline(build) {
		tsOptions.inlineSources = !!build;
		tsOptions.base = path.dirname(absolutePath);

		const compilation = tsb.create(tsOptions, null, null, err => console.log(err));

		return function () {
			const input = es.through();
			const tsFilter = filter(['**/*.ts', '!**/lib/lib*.d.ts', '!**/node_modules/**'], { restore: true });
			const output = input
				.pipe(tsFilter)
				.pipe(sourcemaps.init())
				.pipe(compilation())
				.pipe(sourcemaps.write('.', {
					addComment: !!build,
					includeContent: !!build,
					sourceRoot: '../src'
				}))
				.pipe(tsFilter.restore);

			return es.duplex(input, output);
		};
	}

	const srcOpts = { cwd: path.join(path.dirname(__dirname), relativeDirname), base: srcBase };

	gulp.task(clean, cb => rimraf(out, cb));

	gulp.task(tslint, () => {
		const options = { emitError: true };

		return vfs.src('src/**/*', { base: '.', follow: true, allowEmpty: true })
			.pipe(filter('src/**/*.ts'))
			.pipe(gulptslint({ rulesDirectory: 'tslint' }))
			.pipe(gulptslint.report(options));
	});

	gulp.task(compile, [clean], () => {
		const pipeline = createPipeline(false);
		const input = gulp.src(src, srcOpts);

		return input
			.pipe(pipeline())
			.pipe(gulp.dest(out));
	});

	gulp.task(watch, [], () => {
		gulp.watch(src, [compile]);
	});

	return {
		clean: clean,
		tslint: tslint,
		compile: compile,
		watch: watch
	};
});

gulp.task('clean', tasks.map(t => t.clean));
gulp.task('tslint', tasks.map(t => t.tslint));
gulp.task('compile', tasks.map(t => t.compile));
gulp.task('watch', tasks.map(t => t.watch));
