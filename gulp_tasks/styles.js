const gulp = require('gulp');
const browserSync = require('browser-sync');
const sourcemaps = require('gulp-sourcemaps');
const less = require('gulp-less');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');

const conf = require('../conf/gulp.conf');

gulp.task('styles', styles);

function styles() {
  return gulp.src(conf.path.src('less/app.less'))
    .pipe(sourcemaps.init())
    .pipe(less({compress: false})).on('error', conf.errorHandler('Less'))
    .pipe(postcss([autoprefixer()])).on('error', conf.errorHandler('Autoprefixer'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(conf.path.tmp()))
    .pipe(browserSync.stream());
}
