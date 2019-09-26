import { TestCaseHelper, TestCase } from "@test-helper/helper";
import { TestCaseInput, TestCaseOutput, tsNode, tsConfigPathOpt } from "@test-helper/cli";
import { GlobSync } from "glob";
import { execSync } from "child_process";
import { existsSync, readFileSync, unlinkSync, rmdirSync } from "fs";

afterAll(() => {
   // if the folder is not empty that mean the test is failed.
   // let keep the output file for verification & investigation.
   try { rmdirSync("tests/cli/vectors/out") } catch { }
})

describe("Test DTS Svg module", () => {

   let iglob = new GlobSync(`${__dirname}/svg*.spec.svg`)
   let inputCases: string[] = iglob.found

   let testCases: TestCase<TestCaseInput, TestCaseOutput>[] = []
   inputCases!.forEach(file => {
      testCases.push(TestCaseHelper.
         ReadSimpleSvgTestCase<TestCaseInput, TestCaseOutput>(file))
   })

   testCases.forEach((testCase, caseInd) => {

      describe(`${testCase.name}: #${caseInd + 1}`, () => {

         testCase.input.testOptions.forEach((opt, optInd) => {

            let output = testCase.output.byOptions[optInd]
            test(`${opt.name} #${optInd + 1}`, () => {

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
                  for (let module of Object.keys(opt.options.alias)) {
                     cmdOpt += ` --mod ${module}`
                     cmdOpt += ` --path ${opt.options.alias![module]}`
                  }
               }

               try {
                  let result = execSync(`${tsNode} ${tsConfigPathOpt} --transpile-only src/cli/resutil.ts ${cmdOpt} ${opt.options.glob}`)
                  expect(result).toBeTruthy()
               } catch (err) {
                  fail(err)
               }

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

})

describe("test merged:", () => {

   let iglob = new GlobSync(`${__dirname}/merge/case*.spec.yaml`)
   let inputCases: string[] = iglob.found

   let testCases: TestCase<TestCaseInput, TestCaseOutput>[] = []
   inputCases!.forEach(file => {
      testCases.push(TestCaseHelper.
         ReadTestCase<TestCaseInput, TestCaseOutput>(file))
   })

   testCases.forEach(testCase => {

      testCase.input.testOptions.forEach((opt, optInd) => {

         let output = testCase.output.byOptions[optInd]
         test(`${testCase.name}: ${opt.name} case: #${optInd + 1}`, () => {

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
               for (let module of Object.keys(opt.options.alias)) {
                  cmdOpt += ` --mod ${module}`
                  cmdOpt += ` --path ${opt.options.alias![module]}`
               }
            }
            if (opt.options.wrap) {
               cmdOpt += " -w true"
            }

            try {
               let result = execSync(`${tsNode} ${tsConfigPathOpt} --transpile-only src/cli/resutil.ts ${cmdOpt} ${opt.options.glob}`)
               expect(result).toBeTruthy()
            } catch (err) {
               fail(err)
            }

            expect(existsSync(output.file)).toBeTruthy()

            let buffer = readFileSync(output.file)
            expect(buffer).toBeTruthy()
            expect(buffer.toString()).toBe(output.content)

            // delete the generated file
            unlinkSync(output.file)

         })

      })

   })

})