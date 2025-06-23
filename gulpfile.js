const gulp = require("gulp");
const cleanCSS = require("gulp-clean-css");
const uglify = require("gulp-uglify");
const rename = require("gulp-rename");

// Minify CSS — فایل‌های .min.css رو نادیده بگیر
gulp.task("minify-css", function () {
  return gulp
    .src(["assets/css/**/*.css", "!assets/css/**/*.min.css"])
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("assets/css"));
});

// Minify JS — فایل‌های .min.js رو نادیده بگیر
gulp.task("minify-js", function () {
  return gulp
    .src(["assets/js/**/*.js", "!assets/js/**/*.min.js"])
    .pipe(uglify())
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("assets/js"));
});

// اجرای همزمان هر دو
gulp.task("default", gulp.parallel("minify-css", "minify-js"));
