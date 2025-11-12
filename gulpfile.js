const gulp = require("gulp");
const cleanCSS = require("gulp-clean-css");
const terser = require("gulp-terser");
const rename = require("gulp-rename");

// Minify CSS
gulp.task("minify-css", function () {
  return gulp
    .src(["assets/css/**/*.css", "!assets/css/**/*.min.css"])
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("assets/css"));
});

// Minify JS
gulp.task("minify-js", function () {
  return gulp
    .src(["assets/js/**/*.js", "!assets/js/**/*.min.js"])
    .pipe(
      terser({
        ecma: 2020,
        compress: {
          toplevel: false,
          inline: 1, // جلوگیری از inline خطرناک
          reduce_vars: false,
          hoist_funs: false,
          hoist_vars: false,
        },
        mangle: { toplevel: false },
        format: { comments: false },
      })
    )
    .pipe(rename({ suffix: ".min" }))
    .pipe(gulp.dest("assets/js"));
});

// Default
gulp.task("default", gulp.parallel("minify-css", "minify-js"));
