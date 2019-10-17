import { IResourceModule } from "@resmod/webpack/loader/types";
import { PluginFactory } from "@resmod/webpack/plugins/factory";
import { WebpackUtil } from "@test-helper/compiler";
import { TestCaseHelper } from "@test-helper/helper";
import { Utils } from "@test-helper/util";

import { existsSync, readFileSync, rmdirSync, unlinkSync } from "fs";
import { GlobSync } from "glob";
import { renderSync } from "node-sass";
import { tmpdir } from "os";
import { basename, extname, relative } from "path";
import webpack from "webpack";

interface IOutput {
   module: { [index: string]: string };
   dts: string;
}

afterAll(() => {
   const gl = new GlobSync(`${__dirname}/test-data/style/*.d.ts`);
   gl.found.forEach((file) => {
      unlinkSync(file);
   });
});

const moduleRules: webpack.RuleSetRule[] = [];
const files = ["main", "custom", "sample"];
const exts = ["css", "sass", "scss"];
const fileEntry = `${__dirname}/test-data/index.js`;

describe("Test Style Plugin resource", () => {

   afterAll(() => {
      const gl = new GlobSync(`${__dirname}/out/**/*.d.ts`);
      gl.found.forEach((file) => {
         unlinkSync(file);
      });
      rmdirSync(`${__dirname}/out/dts`);
      rmdirSync(`${__dirname}/out`);

      Utils.removeDir(`${__dirname}/test-data/css-tmp`);
   });

   const verifyResult = (stats: webpack.Stats) => {
      expect(stats.toJson().modules).toBeTruthy();
      stats.toJson().modules!.forEach((mod: any) => {
         const name = mod.name as string;
         const fext = extname(name.substr(0, name.lastIndexOf("."))) as string;
         const index = exts.indexOf(fext.substr(1));
         if (index >= 0) {
            // tslint:disable-next-line: no-eval
            const result = eval(mod.source) as IResourceModule;
            expect(result).toBeTruthy();
            const output = TestCaseHelper.ReadOutputExpected<IOutput>(`${__dirname}/test-data/style/${files[index]}.expect.yml`);
            const clone = Object.assign({}, result);
            delete clone.__description;
            expect(clone).toStrictEqual(output.module);
            expect(result.__description).toBeTruthy();
            expect(result.__description!.rawContent).toBeTruthy();
            expect(result.__description!.files).toBeTruthy();
            expect(result.__description!.files).toStrictEqual([`${__dirname}/test-data/style/${files[index]}${fext}`]);
         }
      });

      const pkg = require(`${process.cwd()}/package.json`).name as string;
      const tmp = `${tmpdir()}/${pkg}/resources-utilities/cache`;
      const dtsDir = `${__dirname}/test-data/style`;
      const dtsRelativeDir = relative(process.cwd(), dtsDir);

      files.forEach((style, i) => {
         // verify typed generated
         expect(existsSync(`${dtsDir}/${style}.${exts[i]}.d.ts`)).toStrictEqual(true);
         const output = TestCaseHelper.ReadOutputExpected<IOutput>(`${dtsDir}/${style}.expect.yml`);
         const dtsMod = output.dts.replace("{@module}", relative(process.cwd(), `${__dirname}/test-data/style/${style}.${exts[i]}`));
         expect(readFileSync(`${dtsDir}/${style}.${exts[i]}.d.ts`).toString().trim()).toStrictEqual(dtsMod);

         // verify temporary file generate for webpack resolve plugin
         const file = `${tmp}/${dtsRelativeDir}/${style}.${exts[i]}.js`;
         expect(existsSync(file)).toStrictEqual(true);
         const content = readFileSync(file);
         // tslint:disable-next-line: no-eval
         const cache = eval(content!.toString()) as IResourceModule;
         const clone = Object.assign({}, cache);
         delete clone.__description;
         expect(cache).toBeTruthy();
         expect(clone).toStrictEqual(output.module);
         expect(cache.__description).toBeTruthy();
         expect(cache.__description!.rawContent !== "").toStrictEqual(true);
         expect(cache.__description!.files).toEqual([`${dtsDir}/${style}.${exts[i]}`]);

      });
   };

   test("Default (No merge, no output, no custom temporary folder)", async () => {

      const plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
      });

      const stats = await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin]);
      verifyResult(stats);
   });

   test("Output Directory", async () => {
      const plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
         output: `${__dirname}/out/dts`,
      });

      await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin]);

      const dtsDir = `${__dirname}/out/dts`;
      files.forEach((style, i) => {
         // verify typed generated
         expect(existsSync(`${dtsDir}/${style}.${exts[i]}.d.ts`)).toStrictEqual(true);
         const output = TestCaseHelper.ReadOutputExpected<IOutput>(`${__dirname}/test-data/style/${style}.expect.yml`);
         const dtsMod = output.dts.replace("{@module}", relative(process.cwd(), `${__dirname}/test-data/style/${style}.${exts[i]}`));
         expect(readFileSync(`${dtsDir}/${style}.${exts[i]}.d.ts`).toString().trim()).toStrictEqual(dtsMod);
      });
   });

   test("Merge", async () => {
      const plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
         merge: [`${__dirname}/test-data/style/`],
      });

      const stats = await WebpackUtil.run(`${__dirname}/test-data/index.merge.js`, moduleRules, [plugin], [plugin]);
      const modules = stats.toJson().modules;

      expect(modules).toBeTruthy();
      modules!.forEach((mod: any) => {
         const name = basename(mod.name);
         if (name === "style.d.js") {
            // tslint:disable-next-line: no-eval
            const result = eval(mod.source) as IResourceModule;
            expect(result).toBeTruthy();
            let extModule: IResourceModule = {};
            exts.forEach((_, i) => {
               const oe = TestCaseHelper.ReadOutputExpected<IOutput>(`${__dirname}/test-data/style/${files[i]}.expect.yml`);
               extModule = Object.assign({}, extModule, oe.module);
            });
            const clone = Object.assign({}, result);
            delete clone.__description;
            expect(clone).toStrictEqual(extModule);

            expect(result.__description!).toBeTruthy();
            expect(result.__description!.files).toBeTruthy();
            expect(result.__description!.files.length).toEqual(3);
            exts.forEach((ext, i) => {
               const fi = result.__description!.files.indexOf(`${__dirname}/test-data/style/${files[i]}.${ext}`);
               expect(fi).toBeGreaterThan(-1);
            });

            expect(result.__description!.rawContent).toBeTruthy();
            let expectRawcontent = "";
            result.__description!.files.forEach((file) => {
               const ext = extname(file);
               if (ext === ".scss" || ext === ".sass") {
                  expectRawcontent += renderSync({ file }).css.toString();
               } else {
                  expectRawcontent += readFileSync(file).toString();
               }
            });
            expect(result.__description!.rawContent).toStrictEqual(expectRawcontent);
         }
      });
   });

   test("Custom Temporary Directory without merge", async () => {
      const plugin = PluginFactory.getPlugins({
         glob: `${__dirname}/test-data/style/*.{css,scss,sass}`,
         tmp: `${__dirname}/test-data/css-tmp`,
      });

      const stats = await WebpackUtil.run(`${__dirname}/test-data/index.js`, moduleRules, [plugin], [plugin]);
      verifyResult(stats);
   });

});
