// gulp
var gulp = require('gulp');

// plugins
const minifyCSS = require('gulp-minify-css');
const sourcemaps = require('gulp-sourcemaps');
const less = require('gulp-less');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const codekit = require("gulp-codekit");
const browserSync = require('browser-sync').create();
const spa = require("browser-sync-spa");

browserSync.use(spa({
    // Only needed for angular apps
    selector: "[ng-app]",

    // Options to pass to connect-history-api-fallback.
    // If your application already provides fallback urls (such as an existing proxy server),
    // this value can be set to false to omit using the connect-history-api-fallback middleware entirely.
    history: {
      index: '/index.html'
    }
}));

gulp.task('styles', function() {
  var opts = {comments:true,spare:true};

  return gulp.src(['assets/less/app.less', 'assets/less/shop.less', 'assets/less/store.less'])
    .pipe(sourcemaps.init({largeFile: true}))
    .pipe(less({compress: false}))
    .pipe(postcss([autoprefixer()]))
    .pipe(minifyCSS(opts))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/css/'))
    .pipe(browserSync.stream());
});

gulp.task("scripts", function() {
  console.log("-- gulp is running task 'scripts'");

  gulp.src("assets/js/main.js")
    .pipe(codekit())
      .on('error', console.log)
    .pipe(gulp.dest("public/js"))
    .pipe(browserSync.stream());
});

// Static Server + watching less/html files
gulp.task('serve', ['styles', 'scripts'], function() {

  browserSync.init({
    server: {
      baseDir: "public"
    }
  });

  gulp.watch("assets/less/*.less", ['styles']);
  gulp.watch("assets/js/*.js", ['scripts']);
  gulp.watch("public/app/partials/*.html").on('change', browserSync.reload);
  gulp.watch("public/js/partials/store/*.html").on('change', browserSync.reload);
  gulp.watch("public/*.html").on('change', browserSync.reload);
});

gulp.task('default', ['serve']);