const gulp = require("gulp");
const cleanCSS = require("gulp-clean-css");
const terser = require("gulp-terser");
const rename = require("gulp-rename");
const sourcemaps = require("gulp-sourcemaps");

/**
 * Minify CSS with source maps
 * Optimizes stylesheets for production deployment
 */
gulp.task("minify-css", function () {
  console.log("🎨 Minifying CSS files...");
  return gulp
    .src(["assets/css/**/*.css", "!assets/css/**/*.min.css"])
    .pipe(sourcemaps.init())
    .pipe(cleanCSS({ 
      compatibility: "ie11",
      level: 2,
      rebase: true 
    }))
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("assets/css"))
    .on("error", (error) => {
      console.error("❌ CSS minification error:", error.message);
      this.emit("end");
    })
    .on("end", () => console.log("✅ CSS minification complete"));
});

/**
 * Minify JavaScript with source maps
 * Compresses JavaScript for optimized delivery
 */
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
          inline: 2,
          reduce_vars: true,
          hoist_funs: false,
          hoist_vars: false,
          drop_console: true,
          pure_funcs: ["console.log", "console.warn"],
          passes: 2
        },
        mangle: { toplevel: false, keep_fnames: false },
        format: { comments: false },
      })
    )
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("assets/js"))
    .on("error", (error) => {
      console.error("❌ JavaScript minification error:", error.message);
      this.emit("end");
    })
    .on("end", () => console.log("✅ JavaScript minification complete"));
});

/**
 * Watch task for development
 * Automatically rebuilds on file changes
 */
gulp.task("watch", function () {
  console.log("👀 Watching for file changes...");
  gulp.watch(
    ["assets/css/**/*.css", "!assets/css/**/*.min.css"],
    { ignoreInitial: false },
    gulp.series("minify-css")
  );
  gulp.watch(
    ["assets/js/**/*.js", "!assets/js/**/*.min.js"],
    { ignoreInitial: false },
    gulp.series("minify-js")
  );
});

/**
 * Default build task
 * Builds all production assets
 */
gulp.task("default", gulp.series(
  gulp.parallel("minify-css", "minify-js"),
  (done) => {
    console.log("🚀 Build complete!");
    done();
  }
));
