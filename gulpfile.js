const { src, dest, parallel, series, watch } = require('gulp'),
	uglify = require('gulp-uglify-es').default,
	browserSync = require('browser-sync').create(),
	imgCompress = require('imagemin-jpeg-recompress'),
	revdel = require('gulp-rev-delete-original'),
	autoprefixer = require('gulp-autoprefixer'),
	fileinclude = require('gulp-file-include'),
	webpackStream = require('webpack-stream'),
	revRewrite = require('gulp-rev-rewrite'),
	sourcemaps = require('gulp-sourcemaps'),
	svgSprite = require('gulp-svg-sprite'),
	cleanCSS = require('gulp-clean-css'),
	imagemin = require('gulp-imagemin'),
	rename = require('gulp-rename'),
	notify = require('gulp-notify'),
	sass = require('gulp-sass'),
	webp = require('gulp-webp'),
	rev = require('gulp-rev'),
	del = require('del');

const svgSprites = () => {
	return src('./src/img/svg/**.svg')
		.pipe(svgSprite({
			mode: {
				stack: {
					sprite: '../sprites.svg'
				}
			},
		}))
		.pipe(dest('./app/img'));
};

const imgToApp = () => {
	return src(['./src/img/**/*.{jpg,jpeg,png,webp,svg}'])
		.pipe(dest('./app/img'));
};

const convertWebp = () => {
	return src('src/img/**/*.jpg')
		.pipe(webp({
			quality: 80,
			preset: 'photo',
			method: 6
		}))
		.pipe(dest('app/img/'));
};

const fontsToApp = () => {
	return src(['./src/fonts/**'])
		.pipe(dest('./app/fonts'));
};

const htmlInclude = () => {
	return src(['./src/*.html'])
		.pipe(fileinclude({
			prefix: '@',
			basepath: '@file'
		}))
		.pipe(dest('./app'))
		.pipe(browserSync.stream());
};

const styles = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', notify.onError()))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(autoprefixer({
			cascade: false,
		}))
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/css/'))
		.pipe(browserSync.stream());
};

const scripts = () => {
	return src('./src/js/main.js')
		.pipe(webpackStream(
			{
				mode: 'development',
				output: {
					filename: 'main.js',
				},
				module: {
					rules: [{
						test: /\.m?js$/,
						exclude: /(node_modules|bower_components)/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: ['@babel/preset-env']
							}
						}
					}]
				},
			}
		))
		.on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
		.pipe(sourcemaps.init())
		.pipe(uglify().on('error', notify.onError()))
		.pipe(sourcemaps.write('.'))
		.pipe(dest('./app/js'))
		.pipe(browserSync.stream());
};

const watchFiles = () => {
	browserSync.init({
		server: {
			baseDir: './app'
		},
	});
	watch('./src/scss/**/*.scss', styles);
	watch('./src/js/**/*.js', scripts);
	watch('./src/html/**/*.html', htmlInclude);
	watch('./src/*.html', htmlInclude);
	watch('./src/fonts/**', fontsToApp);
	watch('./src/img/**/*.{jpg,jpeg,png,webp,svg}', imgToApp);
	watch('./src/img/svg/**.svg', svgSprites);
};

const clean = () => {
	return del(['app/*']);
};

exports.fileinclude = htmlInclude;
exports.styles = styles;
exports.scripts = scripts;
exports.watchFiles = watchFiles;
exports.default = series(clean, parallel(htmlInclude, scripts, imgToApp, fontsToApp, svgSprites), styles, convertWebp, watchFiles);

const imgMinifyBuild = () => {
	return src('app/img/**/*.{jpg,png,jpeg,webp}')
		.pipe(imagemin([
			imgCompress({
				loops: 4,
				min: 70,
				max: 80,
				quality: 'high',
			}),
			imagemin.gifsicle(),
			imagemin.optipng(),
			imagemin.svgo()

		]))
		.pipe(dest('./app/img'));
};

const stylesBuild = () => {
	return src('./src/scss/**/*.scss')
		.pipe(sass({
			outputStyle: 'expanded'
		}).on('error', notify.onError()))
		.pipe(rename({
			suffix: '.min'
		}))
		.pipe(autoprefixer({
			cascade: false,
		}))
		.pipe(cleanCSS({
			level: 2
		}))
		.pipe(dest('./app/css/'));
};

const scriptsBuild = () => {
	return src('./src/js/main.js')
		.pipe(webpackStream(
			{
				mode: 'development',
				output: {
					filename: 'main.js',
				},
				module: {
					rules: [{
						test: /\.m?js$/,
						exclude: /(node_modules|bower_components)/,
						use: {
							loader: 'babel-loader',
							options: {
								presets: ['@babel/preset-env']
							}
						}
					}]
				},
			}))
		.on('error', function (err) {
			console.error('WEBPACK ERROR', err);
			this.emit('end'); // Don't stop the rest of the task
		})
		.pipe(uglify().on('error', notify.onError()))
		.pipe(dest('./app/js'));
};

const cache = () => {
	return src('app/**/*.{css,js,svg,png,jpg,jpeg,woff2}', {
		base: 'app'
	})
		.pipe(rev())
		.pipe(revdel())
		.pipe(dest('app'))
		.pipe(rev.manifest('rev.json'))
		.pipe(dest('app'));
};

const rewrite = () => {
	const manifest = src('app/rev.json');
	return src('app/**/*.html')
		.pipe(revRewrite({
			manifest
		}))
		.pipe(dest('app'));
};

exports.cache = series(cache, rewrite);
exports.build = series(clean, parallel(htmlInclude, scriptsBuild, imgToApp, fontsToApp, svgSprites), stylesBuild, imgMinifyBuild);
