import webpack from 'webpack';
import { WebpackUtil, PromiseWatching } from "@test-helper/compiler";
import { TestCaseHelper, Utils } from "@test-helper/helper";
import { DtsGeneratedOption } from "@resmod/webpack/plugins/generator";
import { GlobSync } from 'glob';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { FileGenHelper } from '@test-helper/file';
import { tmpdir } from 'os';
import rimraf from 'rimraf'

/** */
interface Input {
   name: string
   options: DtsGeneratedOption
}

/** */
interface Output {
   file: string
   cache: string
   module: { [index: string]: string }
   content: string
}

afterAll(() => {
   let glob = new GlobSync(`${__dirname}/case*/*.d.ts`)
   glob.found.forEach(file => {
      unlinkSync(file)
   })
   rimraf.sync(`${__dirname}/case1/tmp`);
})

describe("Webpack Plugin", () => {

   let testCases = TestCaseHelper.ReadTestCase<Input[], Output[]>(`${__dirname}/case1/test.yml`)
   let moduleRules: webpack.RuleSetRule[] = [{
      test: /\.css$/,
      use: [{
         loader: resolve(`${__dirname}/../../helpers/fake/loaders/css.ts`)
      }]
   }]

   describe(`${testCases.name} (running phase)`, () => {

      let fileEntry = `${__dirname}/case1/index.js`

      testCases.input.forEach((inputOpt, index) => {

         let outputCase = testCases.output[index]
         test(`#${index + 1} ${inputOpt.name}`, async () => {

            let stats = await WebpackUtil.run(fileEntry, moduleRules, inputOpt.options);

            expect(stats).toBeTruthy()
            expect(stats.toJson().modules[1].source).toBeTruthy()

            expect(existsSync(outputCase.file)).toStrictEqual(true)
            expect(readFileSync(outputCase.file).toString()).toStrictEqual(outputCase.content)

            if (inputOpt.options.cache) {
               let file = inputOpt.options.tmp ? resolve(outputCase.cache) : outputCase.cache.replace("__TMP__", tmpdir())
               expect(existsSync(file)).toStrictEqual(true)
               let cacheObj = JSON.parse(readFileSync(file).toString())
               expect(cacheObj).toHaveProperty("raw")
               cacheObj["raw"] = ""
               expect(cacheObj).toMatchObject({
                  files: ["tests/webpack/plugins/case1/style.css"],
                  dtsFile: outputCase.file,
                  module: outputCase.module,
                  raw: ""
               })
            }
         })

      })

   })

   describe(`${testCases.name} (watching phase)`, () => {

      let fileGen = new FileGenHelper(`${__dirname}/case1`, true, 1)

      let runtimeTestCase = TestCaseHelper.ReadTestCase<string[], string[]>(`${__dirname}/case1/runtime.yml`)
      var watching: webpack.Watching[] = []

      beforeAll(() => {
         fileGen.computeIndex()
      })

      afterAll(() => {
         fileGen.cleanup()
         if (watching.length > 0) {
            watching.forEach(w => {
               w.close(() => { console.log("watch closed !") })
            })
            watching = []
         }
      })

      beforeEach(() => {
         // create empty css
         fileGen.reset()
      })

      testCases.input.forEach((inputOpt, index) => {

         let outputCase = testCases.output[index]
         test(`#${index + 1} ${inputOpt.name}`, async (done) => {

            let pw = {} as PromiseWatching
            let pm = WebpackUtil.watch(fileGen.getIndexFile(), moduleRules, inputOpt.options, pw);
            watching.push(pw.watching)

            let stats = await pm
            expect(stats).toBeTruthy()
            expect(stats.toJson().modules[1].source).toBeTruthy()

            expect(existsSync(outputCase.file)).toStrictEqual(true)
            expect(readFileSync(outputCase.file).toString()).toStrictEqual(outputCase.content)

            // let change the file
            fileGen.write(0, runtimeTestCase.input[0])
            await Utils.sleep(500)

            // verify .d.ts generate
            let expectedContent = runtimeTestCase.output[0].replace("{name}", fileGen.getRelativeFile(0))
            expect(existsSync(fileGen.getDtsFile(0))).toStrictEqual(true)
            expect(readFileSync(fileGen.getDtsFile(0)).toString()).toStrictEqual(expectedContent)

            done()
         })

      })

   })

   describe("Test changing file", () => {

      // generate 3 css file
      let fileGen = new FileGenHelper(`${__dirname}/case1`, true, 3)

      let runtimeTestCase = TestCaseHelper.ReadTestCase<string[], string[]>(`${__dirname}/case1/runtime.yml`)
      var watching: webpack.Watching[] = []

      beforeAll(() => {
         fileGen.computeIndex()
      })

      afterAll(() => {
         fileGen.cleanup()
         if (watching.length > 0) {
            watching.forEach(w => {
               w.close(() => { console.log("watch closed !") })
            })
            watching = []
         }
      })

      beforeEach(() => {
         // create empty css
         fileGen.reset()
      })

      test("Modified in watching phase", async () => {
         let pw = {} as PromiseWatching
         let opts: DtsGeneratedOption = {
            glob: "tests/webpack/plugins/case1/*.css",
            verifyChange: "date",
            options: {
               cmd: {
                  merge: false,
                  convension: 'snake',
                  glob: []
               }
            }
         };

         let pm = WebpackUtil.watch(fileGen.getIndexFile(), moduleRules, opts, pw);
         watching.push(pw.watching)

         // let change the file
         let cssInput = runtimeTestCase.input

         let modified = fileGen.filesDtsModified()
         for (let fileIndex = 0; fileIndex < fileGen.size(); fileIndex++) {
            fileGen.write(fileIndex, cssInput[0])
            await Utils.sleep(500)
            let afterWatch = fileGen.filesDtsModified()
            let expectedContent = runtimeTestCase.output[0].replace("{name}", fileGen.getRelativeFile(fileIndex))
            expect(existsSync(fileGen.getDtsFile(fileIndex))).toStrictEqual(true)
            expect(readFileSync(fileGen.getDtsFile(fileIndex)).toString()).toStrictEqual(expectedContent)
            expect(afterWatch[fileIndex] === modified[fileIndex]).toEqual(false)
            // remove the modified one and expected that the rest is unchanged
            let removed = afterWatch.splice(fileIndex, 1)
            modified.splice(fileIndex, 1)
            expect(afterWatch).toStrictEqual(modified)
            // add the change back to keep track for next test loop
            afterWatch.splice(fileIndex, 0, removed[0])
            modified = afterWatch
         }

         // get promise update
         let stats = await pm
         expect(stats).toBeTruthy()
         expect(stats.toJson().modules[1].source).toBeTruthy()
      })

   })

})