import { TestCaseHelper, TestCase } from "@test-helper/helper";
import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync, rmdirSync } from "fs";
import { GlobSync } from "glob";
import { TestCaseInput, TestCaseOutput, tsNode, tsConfigPathOpt } from "@test-helper/cli";

afterAll(() => {
   // if the folder is not empty that mean the test is failed.
   // let keep the output file for verification & investigation.
   try { rmdirSync("tests/cli/styles/out") } catch { }
})

describe("Test DTS CSS module", () => {

   let iglob = new GlobSync(`${__dirname}/css*.spec.css`)
   let inputCases: string[] = iglob.found

   let testCases: TestCase<TestCaseInput, TestCaseOutput>[] = []
   inputCases!.forEach(file => {
      testCases.push(TestCaseHelper.
         ReadSimpleCssTestCase<TestCaseInput, TestCaseOutput>(file))
   })

   testCases.forEach((testCase, caseIndex) => {

      describe(`${testCase.name} case: #${caseIndex + 1}`, () => {

         testCase.input.testOptions.forEach((opt, optInd) => {

            let output = testCase.output.byOptions[optInd]
            test(`${opt.name} #${optInd}`, () => {

               var cmdOpt = ""
               if (opt.options.merge) {
                  cmdOpt += " -m true"
               }
               if (opt.options.output) {
                  cmdOpt += ` -o ${opt.options.output}`
               }
               if (opt.options.convension) {
                  cmdOpt += ` -n ${opt.options.convension}`
               }
               if (opt.options.alias) {
                  cmdOpt += ` --mod ${opt.options.alias!.module}`
                  cmdOpt += ` --path ${opt.options.alias!.path}`
               }

               let result = execSync(`${tsNode} ${tsConfigPathOpt} src/cli/resutil.ts ${cmdOpt} ${opt.options.glob}`)
               expect(result).toBeTruthy()
               expect(result.toString()).toBe("")

               expect(existsSync(output.file)).toBe(true)

               let buffer = readFileSync(output.file)
               expect(buffer).toBeTruthy()
               expect(buffer.toString()).toBe(output.content)

               // delete the generated file
               unlinkSync(output.file)

            })
         })
      })
   })

   describe("test merged:", () => {

      let testCase = TestCaseHelper.ReadTestCase<TestCaseInput, TestCaseOutput>("tests/cli/styles/merge/case1.spec.yaml")

      testCase.input.testOptions.forEach((opt, optInd) => {

         let output = testCase.output.byOptions[optInd]
         test(`${opt.name} case: #${optInd + 1}`, () => {

            var cmdOpt = ""
            if (opt.options.merge) {
               cmdOpt += " -m true"
            }
            if (opt.options.output) {
               cmdOpt += ` -o ${opt.options.output}`
            }
            if (opt.options.convension) {
               cmdOpt += ` -n ${opt.options.convension}`
            }
            if (opt.options.alias) {
               cmdOpt += ` --mod ${opt.options.alias!.module}`
               cmdOpt += ` --path ${opt.options.alias!.path}`
            }

            let result = execSync(`${tsNode} ${tsConfigPathOpt} src/cli/resutil.ts ${cmdOpt} ${opt.options.glob}`)

            expect(result).toBeTruthy()
            expect(result.toString()).toBe("")

            expect(existsSync(output.file)).toBe(true)

            let buffer = readFileSync(output.file)
            expect(buffer).toBeTruthy()
            expect(buffer.toString()).toBe(output.content)

            // delete the generated file
            unlinkSync(output.file)

         })

      })

   })

})