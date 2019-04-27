
import { StyleUtils, CssParseOptions } from '@resmod/style/parser'
import { TestCaseHelper, TestCase, CssTestArgument } from '@test-helper/helper'
import { GlobSync } from 'glob';
import { ResourceModule } from '@resmod/loader/types';
import { StyleType, CssSelectorType } from '@resmod/style/types';

interface TestOptions {
   name: string
   options: CssParseOptions
}

interface InputOptions {
   modules: TestOptions[]
}

type TestCaseInput = CssTestArgument<InputOptions>

interface TestCaseOutput {
   modules: ResourceModule[]
}

describe("parser: CSS Module", () => {

   let iglob = new GlobSync(`${__dirname}/module*.spec.css`)
   let inputCases: string[] = iglob.found

   let testCases: TestCase<TestCaseInput, TestCaseOutput>[] = []
   inputCases!.forEach(file => {
      testCases.push(TestCaseHelper.
         ReadCssTestCase<InputOptions, TestCaseInput, TestCaseOutput>(file))
   })

   testCases.forEach((testCase, index) => {

      let input = testCase.input
      let output = testCase.output
      describe(`Test Case:  #${index + 1} (${testCase.name})`, () => {

         let testOptoins = input.additionals.modules
         testOptoins.forEach((testOption, optIndex) => {

            test(`Options: #${optIndex + 1} (${testOption.name})`, () => {
               let elements = StyleUtils.parse(input.rawCss, testOption.options)
               if (output.modules[optIndex] !== undefined && output.modules[optIndex] !== null) {
                  expect(elements).toBeTruthy()
                  expect(elements!.metadata).toBeTruthy()
                  expect(elements!.resourceModule).toBeTruthy()

                  expect(elements!.resourceExtension).toMatchObject(["css"])
                  expect(elements!.resourceType).toBe(StyleType.CSS)

                  expect(elements!.metadata["raw"]).toBeTruthy()
                  expect(elements!.metadata["raw"]).toBe(input.rawCss)

                  expect(elements!.resourceModule).toStrictEqual(output.modules[optIndex])
               } else {
                  expect(elements).toBeUndefined()
               }
            })

         })

      })

   })

})

describe("Test Callback", () => {

   let css = `
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
   }`
   let keywords = ["VersionColor", "SampleCase", "Info", "Mask"]

   test("Prefix Callback", () => {
      let prefixs = ["cLaZz", "iD", "vAr"]
      let expectedPrefixs = ["vAr", "vAr", "cLaZz", "iD"]

      let elements = StyleUtils.parse(css, {
         convension: "camel",
         prefix: true,
         prefixCb: (t: CssSelectorType): string => {
            switch (t) {
               case CssSelectorType.CLASS:
                  return prefixs[0]

               case CssSelectorType.ID:
                  return prefixs[1]

               default:
                  return prefixs[2]
            }
         }
      })

      expect(elements).toBeTruthy()
      expect(elements!.resourceModule).toBeTruthy()
      let keys = Object.keys(elements!.resourceModule)
      keys.forEach((key, index) => {
         expect(key).toBe(`${expectedPrefixs[index]}${keywords[index]}`)
      })
   })

   test("Convension Callback", () => {
      let elements = StyleUtils.parse(css, {
         convensionCb: (name: string): string => {
            return `${name.substr(0, 2).toUpperCase()}-${name.substr(2).toLowerCase()}`
         }
      })

      expect(elements).toBeTruthy()
      expect(elements!.resourceModule).toBeTruthy()
      let keys = Object.keys(elements!.resourceModule)
      keys.forEach((key, index) => {
         expect(key).toBe(`${keywords[index].substr(0, 2).toUpperCase()}-${keywords[index].substr(2).toLowerCase()}`)
      })
   })

})