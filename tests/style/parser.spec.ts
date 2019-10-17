
import { ICssParseOptions, StyleUtils } from "@resmod/style/parser";
import { CssSelectorType, StyleType } from "@resmod/style/types";
import { IResourceModule } from "@resmod/webpack/loader/types";
import { ICssTestArgument, ITestCase, TestCaseHelper } from "@test-helper/helper";
import { GlobSync } from "glob";

interface ITestOptions {
   name: string;
   options: ICssParseOptions;
}

interface IInputOptions {
   modules: ITestOptions[];
}

type TestCaseInput = ICssTestArgument<IInputOptions>;

interface ITestCaseOutput {
   modules: IResourceModule[];
}

describe("parser: CSS Module", () => {

   const iglob = new GlobSync(`${__dirname}/module*.spec.css`);
   const inputCases: string[] = iglob.found;

   const testCases: Array<ITestCase<TestCaseInput, ITestCaseOutput>> = [];
   inputCases!.forEach((file) => {
      testCases.push(TestCaseHelper.
         ReadCssTestCase<IInputOptions, TestCaseInput, ITestCaseOutput>(file));
   });

   testCases.forEach((testCase, index) => {

      const input = testCase.input;
      const output = testCase.output;
      describe(`Test Case:  #${index + 1} (${testCase.name})`, () => {

         const testOptoins = input.additionals.modules;
         testOptoins.forEach((testOption, optIndex) => {

            test(`Options: #${optIndex + 1} (${testOption.name})`, () => {
               const elements = StyleUtils.parse(input.rawCss, testOption.options);
               if (output.modules[optIndex] !== undefined && output.modules[optIndex] !== null) {
                  expect(elements).toBeTruthy();
                  expect(elements!.metadata).toBeTruthy();
                  expect(elements!.resourceModule).toBeTruthy();

                  expect(elements!.resourceExtension).toMatchObject(["css"]);
                  expect(elements!.resourceType).toBe(StyleType.CSS);

                  expect(elements!.metadata.raw).toBeTruthy();
                  expect(elements!.metadata.raw).toBe(input.rawCss);

                  expect(elements!.resourceModule).toStrictEqual(output.modules[optIndex]);
               } else {
                  expect(elements).toBeUndefined();
               }
            });

         });

      });

   });

});

describe("Test Callback", () => {

   const css = `
   :root {
      --version-color: red;
   }

   html {
      color: 1;
      --sample-case:10px;
   }

   body { width: 100%; }
   div { display: inline; }

   div.info {
      display: block;
   }

   .info {
      display: table;
   }

   #mask {
      background-color: red;
   }`;
   const keywords = ["VersionColor", "SampleCase", "Info", "Mask"];

   test("Prefix Callback", () => {
      const prefixs = ["cLaZz", "iD", "vAr"];
      const expectedPrefixs = ["vAr", "vAr", "cLaZz", "iD"];

      const elements = StyleUtils.parse(css, {
         convension: "camel",
         prefix: true,
         prefixCb: (t: CssSelectorType): string => {
            switch (t) {
               case CssSelectorType.CLASS:
                  return prefixs[0];

               case CssSelectorType.ID:
                  return prefixs[1];

               default:
                  return prefixs[2];
            }
         },
      });

      expect(elements).toBeTruthy();
      expect(elements!.resourceModule).toBeTruthy();
      const keys = Object.keys(elements!.resourceModule);
      keys.forEach((key, index) => {
         expect(key).toBe(`${expectedPrefixs[index]}${keywords[index]}`);
      });
   });

   test("Convension Callback", () => {
      const elements = StyleUtils.parse(css, {
         convensionCb: (name: string): string => {
            return `${name.substr(0, 2).toUpperCase()}-${name.substr(2).toLowerCase()}`;
         },
      });

      expect(elements).toBeTruthy();
      expect(elements!.resourceModule).toBeTruthy();
      const keys = Object.keys(elements!.resourceModule);
      keys.forEach((key, index) => {
         expect(key).toBe(`${keywords[index].substr(0, 2).toUpperCase()}-${keywords[index].substr(2).toLowerCase()}`);
      });
   });

});
