import { ITestCaseInput, ITestCaseOutput, tsConfigPathOpt, tsNode } from "@test-helper/cli";
import { ITestCase, TestCaseHelper } from "@test-helper/helper";
import { execSync } from "child_process";
import { existsSync, readFileSync, rmdirSync, unlinkSync } from "fs";
import { GlobSync } from "glob";

afterAll(() => {
   // if the folder is not empty that mean the test is failed.
   // let keep the output file for verification & investigation.
   try { rmdirSync("tests/cli/vectors/out"); } catch { return; }
});

describe("Test DTS Svg module", () => {

   const iglob = new GlobSync(`${__dirname}/svg*.spec.svg`);
   const inputCases: string[] = iglob.found;

   const testCases: Array<ITestCase<ITestCaseInput, ITestCaseOutput>> = [];
   inputCases!.forEach((file) => {
      testCases.push(TestCaseHelper.
         ReadSimpleSvgTestCase<ITestCaseInput, ITestCaseOutput>(file));
   });

   testCases.forEach((testCase, caseInd) => {

      describe(`${testCase.name}: #${caseInd + 1}`, () => {

         testCase.input.testOptions.forEach((opt, optInd) => {

            const output = testCase.output.byOptions[optInd];
            test(`${opt.name} #${optInd + 1}`, () => {

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
                  const result = execSync(`${tsNode} ${tsConfigPathOpt} --transpile-only src/cli/resutil.ts ${cmdOpt} ${opt.options.glob}`);
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

});

describe("test merged:", () => {

   const iglob = new GlobSync(`${__dirname}/merge/case*.spec.yaml`);
   const inputCases: string[] = iglob.found;

   const testCases: Array<ITestCase<ITestCaseInput, ITestCaseOutput>> = [];
   inputCases!.forEach((file) => {
      testCases.push(TestCaseHelper.
         ReadTestCase<ITestCaseInput, ITestCaseOutput>(file));
   });

   testCases.forEach((testCase) => {

      testCase.input.testOptions.forEach((opt, optInd) => {

         const output = testCase.output.byOptions[optInd];
         test(`${testCase.name}: ${opt.name} case: #${optInd + 1}`, () => {

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
            if (opt.options.wrap) {
               cmdOpt += " -w true";
            }

            try {
               const result = execSync(`${tsNode} ${tsConfigPathOpt} --transpile-only src/cli/resutil.ts ` +
                  `${cmdOpt} ${opt.options.glob}`);
               expect(result).toBeTruthy();
            } catch (err) {
               fail(err);
            }

            expect(existsSync(output.file)).toBeTruthy();

            const buffer = readFileSync(output.file);
            expect(buffer).toBeTruthy();
            expect(buffer.toString().trim()).toBe(output.content);

            // delete the generated file
            unlinkSync(output.file);

         });

      });

   });

});
