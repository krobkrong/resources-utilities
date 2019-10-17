import { SvgModuleParser } from "@resmod/vector/svg";
import { SvgElementType } from "@resmod/vector/types";
import { IResourceModule } from "@resmod/webpack/loader/types";
import { PluginFactory } from "@resmod/webpack/plugins/factory";
import { WebpackUtil } from "@test-helper/compiler";
import { TestCaseHelper } from "@test-helper/helper";
import { Utils } from "@test-helper/util";
import { existsSync, readFileSync, unlinkSync } from "fs";
import { GlobSync } from "glob";
import { basename, extname, relative } from "path";
import webpack = require("webpack");

const moduleRules: webpack.RuleSetRule[] = [];
const fileEntry = `${__dirname}/svg-data/index.js`;

interface IOutput {
    module: { [index: string]: string };
    dts: string;
}

describe("Test SVG Plugin resource", () => {

    afterAll(() => {
        const gl = new GlobSync(`${__dirname}/svg-data/**/*.d.ts`);
        gl.found.forEach((file) => {
            unlinkSync(file);
        });

        Utils.removeDir(`${__dirname}/svg-data/out`);
    });

    test("Default plugins", async () => {
        const plugin = PluginFactory.getPlugins({
            glob: `${__dirname}/svg-data/icons/*.svg`,
        });

        const stats = await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin]);
        stats.toJson().modules!.forEach((mod: any) => {
            const name = basename(mod.name as string);
            const ext = extname(name);
            if (ext === "js") {
                const index = name.indexOf(".");
                const filename = name.substring(0, index);
                // tslint:disable-next-line: no-eval
                const result = eval(mod.source) as IResourceModule;
                expect(result.files).toBeTruthy();
                expect(result.files).toStrictEqual([`${__dirname}/svg-data/icons/${name}`]);
                expect(result.resModule).toBeTruthy();
                const expectFile = `${__dirname}/svg-data/icons/${filename}.expect.yml`;
                const output = TestCaseHelper.ReadOutputExpected<IOutput>(expectFile);
                expect(result.resModule).toStrictEqual(output.module);
                expect(result.rawContent).toBeTruthy();
                expect(existsSync(`${__dirname}/svg-data/icons/${filename}.d.ts`));
                const relatitvePath = relative(mod.name as string, process.cwd());
                expect(readFileSync(`${__dirname}/svg-data/icons/${filename}.d.ts`))
                    .toStrictEqual(output.dts.replace("{@module}", relatitvePath));
            }
        });
    });

    test("Output Directory", async () => {
        const plugin = PluginFactory.getPlugins({
            glob: `${__dirname}/svg-data/icons/*.svg`,
            output: `${__dirname}/svg-data/out/dts`,
        });

        await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin]);

        const dtsDir = `${__dirname}/svg-data/out/dts`;

        const gl = new GlobSync(`${__dirname}/svg-data/icons/*.svg`);
        gl.found.forEach((file) => {
            // verify typed generated
            const name = basename(file);
            const index = name.indexOf(".");
            const filename = name.substring(0, index);
            expect(existsSync(`${dtsDir}/${name}.d.ts`)).toStrictEqual(true);
            const output = TestCaseHelper
                .ReadOutputExpected<IOutput>(`${__dirname}/svg-data/icons/${filename}.expect.yml`);
            const dtsMod = output.dts.replace("{@module}", relative(process.cwd(),
                `${__dirname}/svg-data/icons/${filename}.svg`));
            expect(readFileSync(`${dtsDir}/${filename}.svg.d.ts`).toString().trim()).toStrictEqual(dtsMod);
        });
    });

    test("Merge Svg file", async () => {
        const plugin = PluginFactory.getPlugins({
            glob: `${__dirname}/svg-data/all-icons/*.svg`,
            merge: [`${__dirname}/svg-data/all-icons/`],
        });

        const stats = await WebpackUtil.run(`${__dirname}/svg-data/index.merge.js`, moduleRules, [plugin], [plugin]);
        const modules = stats.toJson().modules;
        expect(modules).toBeTruthy();
        modules!.forEach((mod: any) => {
            const name = basename(mod.name);
            if (name === "all-icons.d.js") {
                // tslint:disable-next-line: no-eval
                const result = eval(mod.source) as IResourceModule;
                expect(result).toBeTruthy();
                const output = TestCaseHelper
                    .ReadOutputExpected<IOutput>(`${__dirname}/svg-data/all-icons/module.expect.yml`);
                const clone = Object.assign({}, result);
                delete clone.__description;
                expect(clone).toStrictEqual(output.module);

                expect(result.__description).toBeTruthy();
                expect(result.__description!.files.length).toEqual(4);

                expect(result.__description!.rawContent).toBeTruthy();
                const svg = new SvgModuleParser({ includeMeta: true }).parse(result.__description!.rawContent);
                expect(svg!.metadata.elementType).toStrictEqual(SvgElementType.SVG);
                expect(svg!.metadata).toBeTruthy();
                expect(svg!.metadata.childs).toBeTruthy();
                // after svg element there should only be child element, a def element
                expect(svg!.metadata.childs!.length).toEqual(1);
                expect(svg!.metadata.childs![0].childs!).toBeTruthy();
                // at least 4 element from svg test file should be included
                expect(svg!.metadata.childs![0].childs!.length).toBeGreaterThanOrEqual(4);
                const mergeEleIds = new Map();
                for (const key in output.module) {
                    if (output.module.hasOwnProperty(key)) {
                        mergeEleIds.set(key, true);
                    }
                }
                svg!.metadata.childs![0].childs!.forEach((item) => {
                    if (item.elementType === SvgElementType.SYMBOL) {
                        expect(item.id).toBeTruthy();
                        expect(mergeEleIds.get(item.id)).toBeTruthy();
                        mergeEleIds.delete(item.id);
                    }
                });
                expect(mergeEleIds.size).toEqual(0);
            }
        });
    });

});
