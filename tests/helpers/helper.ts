import { readFileSync } from "fs";
import YAML from 'yaml'

/**
 * the object define the input and output test case
 */
export interface TestCase<I, R> {
   // name of test case
   name: string
   input: I
   output: R
}

/**
 * Css test case
 */
export interface CssTestArgument<T> {
   rawCss: string
   additionals: T
}

/**
 * Vector test case
 */
export interface VectorTestArgument<T> {
   rawVector: string
   additionals: T
}

/**
 * Helper provide the method to read test case from the input test case file.
 */
export namespace TestCaseHelper {

   /**
    * Read the test case input from a yaml file
    * @param file a yaml file format
    */
   export function ReadTestCase<I, R>(file: string): TestCase<I, R> {
      let raw = readFileSync(file).toString()
      return YAML.parse(raw) as TestCase<I, R>
   }

   /**
    * Read test case data from a css spec file. The file must contain 2 separated parts, 
    * first part, is the comment contain yaml test case result expectation. The test case
    * does not include content of css file. To include content of css file use `ReadCssTestCase` instead
    * @param file 
    */
   export function ReadSimpleCssTestCase<I, R>(file: string): TestCase<I, R> {
      let raw = readFileSync(file).toString()
      let index = raw.indexOf("*/")

      return YAML.parse(raw.substring(2, index)) as TestCase<I, R>
   }

   /**
    * Read test case data from css spec file. The file must contain 2 separated parts, 
    * first part, is the comment contain yaml test case result expectation.
    * @param file file test input as css format.
    */
   export function ReadCssTestCase<T, I extends CssTestArgument<T>, R>(file: string): TestCase<I, R> {
      let raw = readFileSync(file).toString()
      let index = raw.indexOf("*/")

      let testCase = YAML.parse(raw.substring(2, index)) as TestCase<I, R>
      testCase.input.rawCss = raw.substring(index + 2)

      return testCase
   }

   /**
    * Read test case data from svg spec file. The file must contain 2 separated parts, 
    * first part, is the comment contain yaml test case result expectation. The test case
    * does not include content of svg file. To include content of svg file use `ReadVectorTestCase` instead
    * @param file 
    */
   export function ReadSimpleSvgTestCase<I, R>(file: string): TestCase<I, R> {
      let raw = readFileSync(file).toString()
      let index = raw.indexOf("-->")

      return YAML.parse(raw.substring(4, index)) as TestCase<I, R>
   }

   /**
    * Read test case data from svg spec file. The file must contain 2 separated parts, 
    * first part, is the comment contain yaml test case result expectation.
    * @param file file test input as svg format.
    */
   export function ReadVectorTestCase<T, I extends VectorTestArgument<T>, R>(file: string): TestCase<I, R> {
      let raw = readFileSync(file).toString()
      let index = raw.indexOf("-->")

      let testCase = YAML.parse(raw.substring(4, index)) as TestCase<I, R>
      testCase.input.rawVector = raw.substring(index + 3)

      return testCase
   }
}