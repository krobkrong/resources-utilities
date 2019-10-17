#!/usr/bin/env node

import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from "fs";
import { GlobSync } from "glob";
import { join, resolve } from "path";
import { basename } from "upath";
import * as yargs from "yargs";
import { JSReplacement } from "./js";
import { TypesReplacement } from "./types";

const argv = yargs.scriptName("replace")
   .usage("\n$0 [-m commonjs] -a '@mod' -r build")
   //
   .string("m")
   .default("m", "commonjs")
   .describe("m", "the format of the javascript file.")
   //
   .boolean("js")
   .describe("js", "the lookup file is a javascript file.")
   //
   .boolean("ts")
   .describe("ts", "the lookup file is a typescript file.")
   //
   .string("a")
   .require("a")
   .describe("a", "alias module use by typescript")
   //
   .string("r")
   .require("r")
   .default("r", ".")
   .describe("r", "root directory of relative path")
   //
   .help("help")
   .argv;

const ext = argv.ts ? ".ts" : ".js";
const iglob = new GlobSync(`${argv.r}/**/*${ext}`);
const files: string[] = iglob.found;

// create common replace function
let replaceContent: ReplaceContent;
if (argv.ts) {
   // move custom webpack declaration
   const definition = "src/types/webpack.d.ts";
   const dir = join(argv.r, "types");
   if (!existsSync(dir)) {
      mkdirSync(dir);
   }
   createReadStream(definition).pipe(createWriteStream(join(dir, basename(definition))));
   TypesReplacement.root = resolve(argv.r);
   replaceContent = TypesReplacement.replace;
} else {
   switch (argv.m) {
      case "commonjs":
         JSReplacement.root = resolve(argv.r);
         replaceContent = JSReplacement.replaceCommonJS;
         break;

      default:
         yargs.showHelp();
         process.exit(1);
   }
}

// loop through all given file
files.forEach((file) => {
   // only javascript is consider as valid file
   writeFileSync(file, replaceContent(file, argv.a));
});

/** Type replacement function */
type ReplaceContent = (file: string, alias: string) => string;
