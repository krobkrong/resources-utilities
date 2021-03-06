#!/usr/bin/env node

import { Generate, ICommandLineOptions } from "@resmod/cli/dts";
import { resolve } from "path";
import * as yargs from "yargs";

const argv = yargs.scriptName("resmod")
   .usage("\n$0 [-o directory] resources/**/*.*")
   // merge flag
   .boolean("m")
   .describe("m", "indicate whether all avariable should be generated and merge into a single dts file.")
   // alias flag
   .string("mod")
   .describe("mod", "the root alias module that reconized by typescript to replace relative path.")
   .string("path")
   .describe("path", "the path to resource file which is replaced by alias module.")
   // output flag
   .string("o")
   .describe("o", "set output directory to store generated dts file.")
   // convension flag
   .string("n")
   .default("n", "camel")
   .describe("n", "set the convension name to be use to generate variable name. " +
      "By default it\'s use camel case and expected the resource to hyphen case.")
   .choices("n", ["camel", "pascal", "snake", "Snake"])
   // wrap flag
   .boolean("w")
   .default("w", false)
   .describe("w", "wrap use with merge option set to true. If wrap is false the " +
      "generated file utilize id value in the resource file otherwise the file name " +
      "will be used as variable name in definition file.")
   //
   .string("s")
   .describe("s", "path to save the parsed data into a single file. Use together " +
      "with merge true. Use . to store the generated file at the same location as original file.")
   // general flag
   .help("help")
   .argv;

if (argv._.length === 0) {
   yargs.showHelp();
   process.exit(0);
}

// create alias object if any
let alias: { [index: string]: string | undefined } | undefined;
if (argv.mod && argv.path) {
   alias = {};
   alias[resolve(argv.path)] = argv.mod;
} else {
   alias = undefined;
}

// create command option
const cmdOpt = {
   alias,
   convension: argv.n,
   glob: argv._,
   merge: argv.m,
   output: argv.o,
   save: argv.s,
   wrap: argv.w,
} as ICommandLineOptions;

// generate dts file
try {
   Generate(cmdOpt);
} catch (e) {
   yargs.showHelp();
}
