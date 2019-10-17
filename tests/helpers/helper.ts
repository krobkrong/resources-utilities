import { readFileSync } from "fs";
import { JSDOM } from "jsdom";
import YAML from "yaml";

/**
 * add window and document to simulate jsdom. Required by webpack plugin to evaluate code generated with
 * runtime injection.
 */
declare global {
   namespace NodeJS {
      // tslint:disable-next-line: interface-name
      interface Global {
         window: Window;
         document: Document;
      }
   }
}
global.window = (new JSDOM(``, { pretendToBeVisual: true })).window;
global.document = window.document;

/**
 * the object define the input and output test case
 */
export interface ITestCase<I, R> {
   // name of test case
   name: string;
   input: I;
   output: R;
}

/**
 * Css test case
 */
export interface ICssTestArgument<T> {
   rawCss: string;
   additionals: T;
}

/**
 * Vector test case
 */
export interface IVectorTestArgument<T> {
   rawVector: string;
   additionals: T;
}

/**
 * Helper provide the method to read test case from the input test case file.
 */
export class TestCaseHelper {

   /**
    * Read the output expectation from a yaml file
    * @param file a yaml file format
    */
   public static ReadOutputExpected<R>(file: string): R {
      const raw = readFileSync(file).toString();
      return YAML.parse(raw) as R;
   }

   /**
    * Read the test case input from a yaml file
    * @param file a yaml file format
    */
   public static ReadTestCase<I, R>(file: string): ITestCase<I, R> {
      const raw = readFileSync(file).toString();
      return YAML.parse(raw) as ITestCase<I, R>;
   }

   /**
    * Read test case data from a css spec file. The file must contain 2 separated parts,
    * first part, is the comment contain yaml test case result expectation. The test case
    * does not include content of css file. To include content of css file use `ReadCssTestCase` instead
    * @param file
    */
   public static ReadSimpleCssTestCase<I, R>(file: string): ITestCase<I, R> {
      const raw = readFileSync(file).toString();
      const index = raw.indexOf("*/");

      return YAML.parse(raw.substring(2, index)) as ITestCase<I, R>;
   }

   /**
    * Read test case data from css spec file. The file must contain 2 separated parts,
    * first part, is the comment contain yaml test case result expectation.
    * @param file file test input as css format.
    */
   public static ReadCssTestCase<T, I extends ICssTestArgument<T>, R>(file: string): ITestCase<I, R> {
      const raw = readFileSync(file).toString();
      const index = raw.indexOf("*/");

      const testCase = YAML.parse(raw.substring(2, index)) as ITestCase<I, R>;
      testCase.input.rawCss = raw.substring(index + 2);

      return testCase;
   }

   /**
    * Read test case data from svg spec file. The file must contain 2 separated parts,
    * first part, is the comment contain yaml test case result expectation. The test case
    * does not include content of svg file. To include content of svg file use `ReadVectorTestCase` instead
    * @param file
    */
   public static ReadSimpleSvgTestCase<I, R>(file: string): ITestCase<I, R> {
      const raw = readFileSync(file).toString();
      const index = raw.indexOf("-->");

      return YAML.parse(raw.substring(4, index)) as ITestCase<I, R>;
   }

   /**
    * Read test case data from svg spec file. The file must contain 2 separated parts,
    * first part, is the comment contain yaml test case result expectation.
    * @param file file test input as svg format.
    */
   public static ReadVectorTestCase<T, I extends IVectorTestArgument<T>, R>(file: string): ITestCase<I, R> {
      const raw = readFileSync(file).toString();
      const index = raw.indexOf("-->");

      const testCase = YAML.parse(raw.substring(4, index)) as ITestCase<I, R>;
      testCase.input.rawVector = raw.substring(index + 3);

      return testCase;
   }
}
