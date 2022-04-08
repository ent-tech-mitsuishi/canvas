"use strict";

// import
import gulp from "gulp";
import source from "vinyl-source-stream";
import ejs from "gulp-ejs";
import plumber from "gulp-plumber";
import sass from "gulp-sass";
import pleeease from "gulp-pleeease";
import browserify from "browserify";
import babelify from "babelify";
import browserSync from "browser-sync";
import watch from "gulp-watch";
import concat from "gulp-concat";
import svgmin from "gulp-svgmin";
import iconfont from "gulp-iconfont";
import consolidate from "gulp-consolidate";
import imagemin from "gulp-imagemin";
import changed from "gulp-changed";
import pngquant from "imagemin-pngquant";
import uglify from "gulp-uglify";
import rename from "gulp-rename";
import sourcemaps from "gulp-sourcemaps";
import del from "del";
import readConfig from "read-config";
import cleanCSS from "gulp-clean-css";

// const
const SRC = "./src";
const CONFIG = "./src/config";
const DEVELOP = "develop";
const RELEASE = "release";
const BASE_PATH = "/";

//********************************************************
//		html
//********************************************************
// ejs
gulp.task("ejs", () => {
  const config = readConfig(`${CONFIG}/meta.json`);
  return gulp
    .src([`${SRC}/ejs/**/*ejs`, "!" + `${SRC}/ejs/**/_*ejs`])
    .pipe(plumber())
    .pipe(ejs({ meta: config }, {}))
    .pipe(rename({ extname: ".html" }))
    .pipe(gulp.dest(`${DEVELOP}/`));
});

gulp.task("html", gulp.series("ejs"));

//********************************************************
//		css
//********************************************************
// sass
gulp.task("sass", () => {
  const config = readConfig(`${CONFIG}/pleeease.json`);
  return gulp
    .src(`${SRC}/sass/**/*scss`)
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(pleeease(config))
    .pipe(sourcemaps.write("../maps/"))
    .pipe(gulp.dest(`${DEVELOP}/assets/css`));
});

gulp.task("css", gulp.series("sass"));

gulp.task("cssmin", () => {
  const config = readConfig(`${CONFIG}/pleeease.json`);
  return gulp
    .src(`${DEVELOP}/**/*.css`)
    .pipe(pleeease(config))
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(gulp.dest(`${RELEASE}/`));
});

//********************************************************
//		js
//********************************************************
gulp.task("browserify", () => {
  return browserify(`${SRC}/js/project.js`, { debug: true })
    .transform(babelify)
    .bundle()
    .pipe(source("project.js"))
    .pipe(gulp.dest([`${DEVELOP}/assets/js`]));
});
gulp.task("js", gulp.parallel("browserify"));

gulp.task("uglify", () => {
  return (
    gulp
      .src(`${DEVELOP}/**/*.js`)
      //.pipe(uglify({compress:{drop_console: true},preserveComments: 'license'}))
      .pipe(
        uglify({ compress: { drop_console: true }, output: { comments: /^!/ } })
      )
      .pipe(gulp.dest(`${RELEASE}/`))
  );
});

//********************************************************
//		serve
//********************************************************
gulp.task("browser-sync", () => {
  browserSync({
    server: {
      baseDir: DEVELOP,
    },
    startPath: BASE_PATH,
    ghostMode: false,
  });
  watch([`${SRC}/ejs/**/*.ejs`], gulp.series("html", browserSync.reload));
  watch([`${SRC}/sass/**/*.scss`], gulp.series("sass", browserSync.reload));
  watch([`${SRC}/js/**/*.js`], gulp.series("js", browserSync.reload));
});

gulp.task("serve", gulp.series("browser-sync"));

//********************************************************
//		concat
//********************************************************
gulp.task("concat:lib_css", function () {
  return gulp
    .src("./lib/css/*css")
    .pipe(concat("lib.css"))
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(gulp.dest(`${DEVELOP}/assets/css/`));
});
// JSライブラリ追加した場合はここに足す。
gulp.task("concat:lib_js", function () {
  return gulp
    .src(["./lib/js/*js"])
    .pipe(concat("lib.js"))
    .pipe(gulp.dest(`${DEVELOP}/assets/js/`));
});
gulp.task("concat", gulp.series("concat:lib_js", "concat:lib_css"));
//********************************************************
//		image_min
//********************************************************
gulp.task("imagemin:global", function () {
  return gulp
    .src(`${DEVELOP}/**/assets/**/*.+(jpg|jpeg|png|gif|svg|ico)`)
    .pipe(changed(`${RELEASE}/assets/img`))
    .pipe(imagemin([pngquant()]))
    .pipe(imagemin())
    .pipe(gulp.dest(`${RELEASE}`));
});

gulp.task("imagemin", gulp.series("imagemin:global"));

//********************************************************
//		webfont
//********************************************************
gulp.task("compressSVG", function () {
  return gulp
    .src(`${SRC}/font/svg/*.svg`)
    .pipe(svgmin())
    .pipe(gulp.dest(`${SRC}/font/svg_min`));
});
gulp.task("convertToFontFromSVG", function () {
  return gulp
    .src(`${SRC}/font/svg_min/*.svg`)
    .pipe(iconfont({ fontName: "iconf" }))
    .on("glyphs", function (glyphs, options) {
      gulp
        .src(`${SRC}/font/template/template.css`)
        .pipe(
          consolidate("lodash", {
            glyphs: glyphs,
            fontName: "iconf",
            fontPath: "../font/",
            className: "iconf",
          })
        )
        .pipe(concat("iconf.css"))
        .pipe(gulp.dest("lib/css"));
    })
    .pipe(gulp.dest(`${DEVELOP}/assets/font`));
});
gulp.task("webfont", gulp.series("compressSVG", "convertToFontFromSVG"));

//********************************************************
//		clean
//********************************************************
gulp.task("clean", function () {
  return del(`${RELEASE}/`);
});
//********************************************************
//		copy
//********************************************************
gulp.task("copy", function () {
  return gulp
    .src(
      [
        //`${DEVELOP}/**/assets/font/**`
        `${DEVELOP}/**/assets/doc/**`,
        `${DEVELOP}/**/assets/js/lib.js`,
        `${DEVELOP}/**/*.html`,
        `${DEVELOP}/**/assets/svg/**`,
      ],
      { base: `${DEVELOP}` }
    )
    .pipe(gulp.dest(`${RELEASE}/`));
});
//********************************************************
//		short cut
//********************************************************
//font
gulp.task("f", gulp.series("webfont"));
//ライブラリ生成
gulp.task("l", gulp.series("concat:lib_css", "concat:lib_js"));
//開発用
gulp.task("d", gulp.series("serve"));
//リリース用
gulp.task(
  "r",
  gulp.series(
    "clean",
    "sass",
    "concat",
    "ejs",
    "uglify",
    "cssmin",
    "imagemin",
    "copy"
  )
);
