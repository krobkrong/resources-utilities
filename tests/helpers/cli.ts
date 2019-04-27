import { CommandLineOptions } from "@resmod/cli/dts";

export interface TestOptions {
   name: string
   options: CommandLineOptions
}

export interface TestCaseInput {
   testOptions: TestOptions[]
}

export interface TestCaseOutput {
   byOptions: {
      /**
       * location of the generated file
       */
      file: string
      /**
       * expected content in the generated file.
       */
      content: string
   }[]
}

/** location of ts node command */
export let tsNode = "node_modules/ts-node/dist/bin.js"
/** option to allow ts node utilize the config file from the project */
export let tsConfigPathOpt = "-r tsconfig-paths/register"