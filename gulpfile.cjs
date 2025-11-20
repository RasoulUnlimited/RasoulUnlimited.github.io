const gulp = require("gulp");
const cleanCSS = require("gulp-clean-css");
const terser = require("gulp-terser");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");

// Minify CSS with source maps
gulp.task("minify-css", function () {
  console.log("🎨 Minifying CSS files...");
  return gulp
    .src(["assets/css/**/*.css", "!assets/css/**/*.min.css"])
    .pipe(sourcemaps.init())
    .pipe(cleanCSS({ 
      compatibility: "ie8",
      level: 2 
    }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("assets/css"))
    .on("end", () => console.log("✅ CSS minification complete"));
});

// Minify JS with source maps
gulp.task("minify-js", function () {
  console.log("⚡ Minifying JavaScript files...");
  return gulp
    .src(["assets/js/**/*.js", "!assets/js/**/*.min.js"])
    .pipe(sourcemaps.init())
    .pipe(
      terser({
        ecma: 2020,
        compress: {
          toplevel: false,
          inline: 1,
          reduce_vars: false,
          hoist_funs: false,
          hoist_vars: false,
          drop_console: false // Keep console for debugging; set to true for production
        },
        mangle: { toplevel: false },
        format: { comments: false },
      })
    )
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("assets/js"))
    .on("end", () => console.log("✅ JavaScript minification complete"));
});

// Watch task for development
gulp.task("watch", function () {
  console.log("👀 Watching for file changes...");
  gulp.watch("assets/css/**/*.css", { ignoreInitial: false }, gulp.task("minify-css"));
  gulp.watch("assets/js/**/*.js", { ignoreInitial: false }, gulp.task("minify-js"));
});

// Default build task
gulp.task("default", gulp.series(
  gulp.parallel("minify-css", "minify-js"),
  (done) => {
    console.log("🚀 Build complete!");
    done();
  }
));
