import { ITestCaseInput, ITestCaseOutput, tsConfigPathOpt, tsNode } from "@test-helper/cli";
import { ITestCase, TestCaseHelper } from "@test-helper/helper";
import { execSync } from "child_process";
import { existsSync, readFileSync, rmdirSync, unlinkSync } from "fs";
import { GlobSync } from "glob";

afterAll(() => {
   // if the folder is not empty that mean the test is failed.
   // let keep the output file for verification & investigation.
   try { rmdirSync("tests/cli/styles/out"); } catch { return; }
});

describe("Test DTS CSS module", () => {

   const iglob = new GlobSync(`${__dirname}/css*.spec.css`);
   const inputCases: string[] = iglob.found;

   const testCases: Array<ITestCase<ITestCaseInput, ITestCaseOutput>> = [];
   inputCases!.forEach((file) => {
      testCases.push(TestCaseHelper.
         ReadSimpleCssTestCase<ITestCaseInput, ITestCaseOutput>(file));
   });

   testCases.forEach((testCase, caseIndex) => {

      describe(`${testCase.name} case: #${caseIndex + 1}`, () => {

         testCase.input.testOptions.forEach((opt, optInd) => {

            const output = testCase.output.byOptions[optInd];
            test(`${opt.name} #${optInd}`, async () => {

               let cmdOpt = "";
               if (opt.options.merge) {
                  cmdOpt += " -m true";
               }
               if (opt.options.output) {
                  cmdOpt += ` -o ${opt.options.output}`;
               }
               if (opt.options.convension) {
                  cmdOpt += ` -n ${opt.options.convension}`;
               }
               if (opt.options.alias) {
                  for (const module of Object.keys(opt.options.alias)) {
                     cmdOpt += ` --mod ${module}`;
                     cmdOpt += ` --path ${opt.options.alias![module]}`;
                  }
               }

               try {
                  const option = "--transpile-only src/cli/resutil.ts";
                  const result = execSync(`${tsNode} ${tsConfigPathOpt} ${option} ${cmdOpt} ${opt.options.glob}`);
                  expect(result).toBeTruthy();
               } catch (err) {
                  fail(err);
               }

               expect(existsSync(output.file)).toBe(true);

               const buffer = readFileSync(output.file);
               expect(buffer).toBeTruthy();
               expect(buffer.toString().trim()).toBe(output.content);

               // delete the generated file
               unlinkSync(output.file);

            });
         });
      });
   });

   describe("test merged:", () => {

      const testCase = TestCaseHelper
         .ReadTestCase<ITestCaseInput, ITestCaseOutput>("tests/cli/styles/merge/case1.spec.yaml");

      testCase.input.testOptions.forEach((opt, optInd) => {

         const output = testCase.output.byOptions[optInd];
         test(`${opt.name} case: #${optInd + 1}`, async () => {

            let cmdOpt = "";
            if (opt.options.merge) {
               cmdOpt += " -m true";
            }
            if (opt.options.output) {
               cmdOpt += ` -o ${opt.options.output}`;
            }
            if (opt.options.convension) {
               cmdOpt += ` -n ${opt.options.convension}`;
            }
            if (opt.options.alias) {
               for (const module of Object.keys(opt.options.alias)) {
                  cmdOpt += ` --mod ${module}`;
                  cmdOpt += ` --path ${opt.options.alias![module]}`;
               }
            }

            try {
               const result = execSync(`${tsNode} ${tsConfigPathOpt} --transpile-only src/cli/resutil.ts ` +
                  `${cmdOpt} ${opt.options.glob}`);
               expect(result).toBeTruthy();
            } catch (err) {
               fail(err);
            }

            expect(existsSync(output.file)).toBe(true);

            const buffer = readFileSync(output.file);
            expect(buffer).toBeTruthy();
            expect(buffer.toString().trim()).toBe(output.content);

            // delete the generated file
            unlinkSync(output.file);

         });

      });

   });

});
