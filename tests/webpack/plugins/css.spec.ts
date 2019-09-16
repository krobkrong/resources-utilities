import { PluginFactory } from "@resmod/webpack/plugins/factory";
import { GeneratedMetadata } from "@resmod/webpack/plugins/plugin";
import { ResourceModule } from "@resmod/webpack/loader/types";
import { WebpackUtil } from "@test-helper/compiler";
import { TestCaseHelper, Utils } from "@test-helper/helper";

import webpack from "webpack"
import { relative, extname, basename } from "path";
import { tmpdir } from "os";
import { existsSync, unlinkSync, readFileSync, rmdirSync } from "fs";
import { GlobSync } from "glob";
import { renderSync } from "node-sass";


interface Output {
   module: { [index: string]: string }
   dts: string
}

afterAll(() => {
   let gl = new GlobSync(`${__dirname}/test-data/style/*.d.ts`)
   gl.found.forEach(file => {
      unlinkSync(file)
   })
})

let moduleRules: webpack.RuleSetRule[] = []
let files = ["main", "custom", "sample"]
let exts = ["css", "sass", "scss"]
let fileEntry = `${__dirname}/test-data/index.js`

describe("Test Style Plugin resource", () => {

   afterAll(() => {
      let gl = new GlobSync(`${__dirname}/out/**/*.d.ts`)
      gl.found.forEach(file => {
         unlinkSync(file)
      })
      rmdirSync(`${__dirname}/out/dts`)
      rmdirSync(`${__dirname}/out`)

      Utils.removeDir(`${__dirname}/test-data/css-tmp`)
   })

   let verifyResult = (stats: webpack.Stats) => {
      expect(stats.toJson().modules).toBeTruthy()
      stats.toJson().modules!.forEach((mod: any) => {
         let name = mod.name as string
         let fext = extname(name.substr(0, name.lastIndexOf("."))) as string
         let index = exts.indexOf(fext.substr(1))
         if (index >= 0) {
            let result = JSON.parse(mod.source) as GeneratedMetadata
            expect(result.files).toBeTruthy()
            expect(result.files).toStrictEqual([`${__dirname}/test-data/style/${files[index]}${fext}`])
            expect(result.resModule).toBeTruthy()
            let output = TestCaseHelper.ReadOutputExpected<Output>(`${__dirname}/test-data/style/${files[index]}.expect.yml`)
            expect(result.resModule).toStrictEqual(output.module)
            expect(result.rawContent).toBeTruthy()
         }
      })

      let pkg = require(`${process.cwd()}/package.json`).name as string
      let tmp = `${tmpdir()}/${pkg}/resources-utilities/cache`
      let dtsDir = `${__dirname}/test-data/style`
      let dtsRelativeDir = relative(process.cwd(), dtsDir)

      files.forEach((style, i) => {
         // verify typed generated
         expect(existsSync(`${dtsDir}/${style}.${exts[i]}.d.ts`)).toStrictEqual(true)
         let output = TestCaseHelper.ReadOutputExpected<Output>(`${dtsDir}/${style}.expect.yml`)
         let dtsMod = output.dts.replace("{@module}", relative(process.cwd(), `${__dirname}/test-data/style/${style}.${exts[i]}`))
         expect(readFileSync(`${dtsDir}/${style}.${exts[i]}.d.ts`).toString()).toStrictEqual(dtsMod)

         // verify temporary file generate for webpack resolve plugin
         let file = `${tmp}/${dtsRelativeDir}/${style}.${exts[i]}.json`
         expect(existsSync(file)).toStrictEqual(true)
         let cache = require(file) as GeneratedMetadata
         expect(cache.rawContent !== "").toStrictEqual(true)
         expect(cache.files).toEqual([`${dtsDir}/${style}.${exts[i]}`])
         expect(cache.resModule).toBeTruthy()
         expect(cache.resModule).toStrictEqual(output.module)
      })
   }

   test("Default (No merge, no output, no custom temporary folder)", async () => {

      let plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`
      })

      let stats = await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin])
      verifyResult(stats)
   })

   test("Output Directory", async () => {
      let plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
         output: `${__dirname}/out/dts`
      })

      await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin])

      let dtsDir = `${__dirname}/out/dts`
      files.forEach((style, i) => {
         // verify typed generated
         expect(existsSync(`${dtsDir}/${style}.${exts[i]}.d.ts`)).toStrictEqual(true)
         let output = TestCaseHelper.ReadOutputExpected<Output>(`${__dirname}/test-data/style/${style}.expect.yml`)
         let dtsMod = output.dts.replace("{@module}", relative(process.cwd(), `${__dirname}/test-data/style/${style}.${exts[i]}`))
         expect(readFileSync(`${dtsDir}/${style}.${exts[i]}.d.ts`).toString()).toStrictEqual(dtsMod)
      })
   })

   test("Merge", async () => {
      let plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
         merge: [`${__dirname}/test-data/style/`]
      })

      let stats = await WebpackUtil.run(`${__dirname}/test-data/index.merge.js`, moduleRules, [plugin], [plugin]);
      let modules = stats.toJson().modules

      expect(modules).toBeTruthy()
      modules!.forEach((mod: any) => {
         let name = basename(mod.name)
         if (name === "style.d.json") {
            let result = JSON.parse(mod.source) as GeneratedMetadata
            expect(result.files).toBeTruthy()
            expect(result.files.length).toEqual(3)
            exts.forEach((ext, i) => {
               let fi = result.files.indexOf(`${__dirname}/test-data/style/${files[i]}.${ext}`)
               expect(fi).toBeGreaterThan(-1)
            })

            expect(result.resModule).toBeTruthy()
            let extModule: ResourceModule = {}
            exts.forEach((_, i) => {
               let oe = TestCaseHelper.ReadOutputExpected<Output>(`${__dirname}/test-data/style/${files[i]}.expect.yml`)
               extModule = Object.assign({}, extModule, oe.module)
            })
            expect(result.resModule).toStrictEqual(extModule)

            expect(result.rawContent).toBeTruthy()
            let expectRawcontent = ""
            result.files.forEach(file => {
               let ext = extname(file)
               if (ext === ".scss" || ext === ".sass") {
                  expectRawcontent += renderSync({ file: file }).css.toString()
               } else {
                  expectRawcontent += readFileSync(file).toString()
               }
            })
            expect(result.rawContent).toStrictEqual(expectRawcontent)
         }
      })
   })

   test("Custom Temporary Directory without merge", async () => {
      let plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
         tmp: `${__dirname}/test-data/css-tmp`
      })
  
      let stats = await WebpackUtil.run(`${__dirname}/test-data/index.js`, moduleRules, [plugin], [plugin]);
      verifyResult(stats)
   })

})