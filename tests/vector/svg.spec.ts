import { TestCaseHelper, TestCase, VectorTestArgument } from '@test-helper/helper'
import { GlobSync } from 'glob';
import { VectorParseOptions, VectorUtils } from '@resmod/vector/parser';
import { ResourceModule, ResourceMetadata } from '@resmod/loader/types';
import { VectorType, VectorElementType, SvgElementType } from '@resmod/vector/types';


interface TestOptions {
   name: string
   options: VectorParseOptions
}

interface InputOptions {
   testOptions: TestOptions[]
}

type TestCaseInput = VectorTestArgument<InputOptions>

interface ExpectedResult {
   module: ResourceModule
   meta: ResourceMetadata
}

interface TestCaseOutput {
   byOptions: ExpectedResult[]
}

describe("Parse svg module", () => {

   let iglob = new GlobSync(`${__dirname}/svg*.spec.svg`)
   let inputCases: string[] = iglob.found

   let testCases: TestCase<TestCaseInput, TestCaseOutput>[] = []
   inputCases!.forEach(file => {
      testCases.push(TestCaseHelper.ReadVectorTestCase<InputOptions, TestCaseInput, TestCaseOutput>(file))
   })

   testCases.forEach((testCase, i) => {

      let input = testCase.input
      let output = testCase.output
      describe(`Test Case: #${i + 1} (${testCase.name})`, () => {

         let testOptoins = input.additionals.testOptions
         testOptoins.forEach((testOption, optIndex) => {

            test(`Options: #${optIndex + 1} (${testOption.name})`, () => {

               let elements = VectorUtils.parse(input.rawVector, testOption.options)
               if (output.byOptions[optIndex].module !== undefined && output.byOptions[optIndex].module !== null) {
                  expect(elements).toBeTruthy()
                  expect(elements!.resourceType).toBe(VectorType.SVG)
                  expect(elements!.resourceExtension).toStrictEqual(["svg"])
                  expect(elements!.metadata).toBeTruthy()
                  expect(elements!.metadata).toStrictEqual(output.byOptions[optIndex].meta)
                  expect(elements!.resourceModule).toBeTruthy()
                  expect(elements!.resourceModule).toStrictEqual(output.byOptions[optIndex].module)
               } else {
                  expect(elements).toBeUndefined()
               }

            })

         })


      })

   })

})

describe("Test Callback", () => {

   let prefix = ["MaSK", "Poly", "cIcLE"]
   let ids = ["myMask", "poly_id", "simple-circle"]
   let idsCamel = ["Mymask", "Poly_id", "SimpleCircle"]

   let svg = `
      <svg viewBox="-10 -10 120 120">
      <mask id="${ids[0]}">
         <!-- Everything under a white pixel will be visible -->
         <rect x="0" y="0" width="100" height="100" fill="white" />

         <!-- Everything under a black pixel will be invisible -->
         <path d="M10,35 A20,20,0,0,1,50,35 A20,20,0,0,1,90,35 Q90,65,50,95 Q10,65,10,35 Z" fill="black" />
      </mask>
      
      <polygon id="${ids[1]}" points="-10,110 110,110 110,-10" fill="orange" />

      <!-- with this mask applied, we "punch" a heart shape hole into the circle -->
      <circle id="${ids[2]}" cx="50" cy="50" r="50" />
      </svg>`

   test("Test prefix callback", () => {
      let elements = VectorUtils.parse(svg, {
         convension: "camel", prefix: true, prefixCb: (vt: VectorType, et: VectorElementType) => {
            let typePrefix
            switch (vt) {
               case VectorType.SVG:
                  typePrefix = "svg"
                  break;

               default:
                  typePrefix = "unknown"
                  break;
            }

            let elTypePrefix
            switch (et) {
               case SvgElementType.SVG:
                  elTypePrefix = "---" // intentionally as svg does not include resource module 
                  break;

               case SvgElementType.MASK:
                  elTypePrefix = prefix[0]
                  break;

               case SvgElementType.POLYGON:
                  elTypePrefix = prefix[1]
                  break;

               case SvgElementType.CIRCLE:
                  elTypePrefix = prefix[2]
                  break;

               default:
                  elTypePrefix = "---" // no element matched anyway
                  break;
            }
            return `${typePrefix}_${elTypePrefix}`
         }
      })
      // we don't test metadata, it's verify by other test case
      expect(elements).toBeTruthy()
      expect(elements!.metadata).toBeTruthy()
      expect(elements!.resourceModule).toBeTruthy()

      let keys = Object.keys(elements!.resourceModule)
      expect(keys.length).toBe(3)
      keys.forEach((key, index) => {
         expect(key).toBe(`svg_${prefix[index]}${idsCamel[index]}`)
      })
   })

   test("Test convention callback", () => {
      let elements = VectorUtils.parse(svg, {
         convension: "camel", convensionCb: (name: string) => {
            return `${name.substr(0, 2).toUpperCase()}-${name.substr(2).toLowerCase()}`
         }
      })
      // we don't test metadata, it's verify by other test case
      expect(elements).toBeTruthy()
      expect(elements!.metadata).toBeTruthy()
      expect(elements!.resourceModule).toBeTruthy()

      let keys = Object.keys(elements!.resourceModule)
      expect(keys.length).toBe(3)
      keys.forEach((key, index) => {
         expect(key).toBe(`${ids[index].substr(0, 2).toUpperCase()}-${ids[index].substr(2).toLowerCase()}`)
      })
   })

})