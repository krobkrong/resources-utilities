import { readFileSync, existsSync, readdirSync, PathLike, lstatSync, unlinkSync, rmdirSync } from "fs";
import YAML from 'yaml'
import { JSDOM } from 'jsdom';
import { SvgMetadata } from "@resmod/vector/svg";

/**
 * add window and document to simulate jsdom. Required by webpack plugin to evaluate code generated with
 * runtime injection.
 */
declare global {
   namespace NodeJS {
      interface Global {
         window: Window;
         document: Document;
      }
   }
}
global.window = (new JSDOM(``, { pretendToBeVisual: true })).window;
global.document = window.document

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
 * provide utilities function as helper during test phase.
 */
export namespace Utils {
   /**
    * Sleep a fashion to let current execution wait for some amount of time
    * before it continue executed.
    * @param ms time in millisecond
    */
   export function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
   }

   /**
    * generate random name
    * @param length length of random string
    * @param includeTime true if time in millisecond is also included otherwise on random string would return.
    */
   export function randomName(length: number, includeTime: boolean = true): string {
      var result = '';
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var chLen = chars.length;
      for (var i = 0; i < length; i++) {
         result += chars.charAt(Math.floor(Math.random() * chLen));
      }
      return includeTime ? `${result}${new Date().getTime()}` : result;
   }

   /**
    * Remove directory recursively
    * @param dir directory to be removed
    */
   export function removeDir(dir: PathLike) {
      if (existsSync(dir)) {
         readdirSync(dir).forEach(function (file, _) {
            var curPath = dir + "/" + file;
            if (lstatSync(curPath).isDirectory()) { // recurse
               removeDir(curPath);
            } else { // delete file
               unlinkSync(curPath);
            }
         });
         rmdirSync(dir);
      }
   }

   /**
    * Compare two resource metadata throught hierarchy
    * @param rm1 first resource metadata to be used to compare
    * @param rm2 second resource metadata to be used to compare
    */
   export function IsResourceMetadataEqual(rm1: SvgMetadata, rm2: SvgMetadata, excludeId: boolean = false): boolean {
      let debug = (msg: string) => { console.log(msg) }
      if (rm1.name !== rm2.name) { debug(`resource different name ${rm1.name} !== ${rm2.name}`); return false }
      let keys1 = Object.keys(rm1)
      let keys2 = Object.keys(rm2)
      
      if (excludeId) {
         let index1 = keys1.indexOf("id"); if (index1 >= 0) keys1.splice(index1, 1)
         let index2 = keys2.indexOf("id"); if (index2 >= 0) keys2.splice(index2, 1)
      }

      if (keys1.length !== keys2.length) {
         let rm1Key = keys1.join(',')
         let rm2Key = keys2.join(',')
         debug(`resource different attr ${keys1.length} (${rm1Key}) vs ${keys2.length} (${rm2Key})`)
         return false
      }

      for (let key of keys1) {
         if (key === "raw" || key === "name" || key === "elementType" || key === "ctext" || key === "childs") continue
         if (keys2.indexOf(key) < 0) { debug(`key ${key} did not existed on both side`); return false }
         if (rm1[key] !== rm2[key]) { debug(`key value not matched ${rm1[key]} !== ${rm2[key]}`); return false }
         // all keys is good fit
      }

      if ((rm1.childs === undefined || rm1.childs === null) && (rm2.childs === undefined || rm2.childs === null)) return true
      if (rm1.childs!.length !== rm2.childs!.length) { debug(`child size not matched ${rm1.childs!.length} !== ${rm2.childs!.length}`); return false }
      // IMPORTANT: child can be different order, relied on parser and serialize build in to ensure order is consistent
      for (let i = 0; i < rm1.childs!.length; i++) {
         return IsResourceMetadataEqual(rm1.childs![i], rm2.childs![i], excludeId)
      }
      return true
   }
}

/**
 * Helper provide the method to read test case from the input test case file.
 */
export namespace TestCaseHelper {

   /**
    * Read the output expectation from a yaml file
    * @param file a yaml file format
    */
   export function ReadOutputExpected<R>(file: string): R {
      let raw = readFileSync(file).toString()
      return YAML.parse(raw) as R
   }

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