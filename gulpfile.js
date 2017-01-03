// gulp
var gulp = require('gulp');

// plugins
const connect = require('gulp-connect');
const minifyCSS = require('gulp-minify-css');
const sourcemaps = require('gulp-sourcemaps');
const less = require('gulp-less');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const codekit = require("gulp-codekit");


gulp.task('connect', function () {
  connect.server({
    //host: 'spartangeek.dev',
    root: 'public/',
    port: 8080,
    fallback: 'public/index.html',
    livereload: true
  });
  gulp.src('./public/*.html').pipe(connect.reload());
  gulp.src('./public/js/*.js').pipe(connect.reload());
});

gulp.task('styles', function() {
  var opts = {comments:true,spare:true};

  return gulp.src('assets/less/app.less')
    .pipe(sourcemaps.init({largeFile: true}))
    .pipe(less({compress: false}))
    .pipe(postcss([autoprefixer()]))
    .pipe(minifyCSS(opts))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/css/'))
    //.pipe(browserSync.stream());
});

gulp.task("scripts", function() {
  console.log("-- gulp is running task 'scripts'");

  gulp.src("assets/js/main.js")
    .pipe(codekit())
      .on('error', console.log)
    .pipe(gulp.dest("public/js"));
});

gulp.task('serve',
  ['styles', 'connect']
);