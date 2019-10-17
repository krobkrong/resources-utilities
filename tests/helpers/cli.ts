import { ICommandLineOptions } from "@resmod/cli/dts";

export interface ITestOptions {
   name: string;
   options: ICommandLineOptions;
}

export interface ITestCaseInput {
   testOptions: ITestOptions[];
}

export interface ITestCaseOutputData {
   /**
    * location of the generated file
    */
   file: string;
   /**
    * expected content in the generated file.
    */
   content: string;
}

export interface ITestCaseOutput {
   byOptions: ITestCaseOutputData[];
}

/** location of ts node command */
export let tsNode = "node_modules/ts-node/dist/bin.js";
/** option to allow ts node utilize the config file from the project */
export let tsConfigPathOpt = "-r tsconfig-paths/register";
