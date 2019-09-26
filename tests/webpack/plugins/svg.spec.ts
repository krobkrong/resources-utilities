import { PluginFactory } from "@resmod/webpack/plugins/factory"
import { WebpackUtil } from "@test-helper/compiler"
import webpack = require("webpack")
import { TestCaseHelper, Utils } from "@test-helper/helper"
import { basename, extname, relative } from "path"
import { GlobSync } from "glob"
import { unlinkSync, existsSync, readFileSync } from "fs"
import { SvgModuleParser } from "@resmod/vector/svg"
import { SvgElementType } from "@resmod/vector/types"
import { ResourceModule } from "@resmod/webpack/loader/types"

let moduleRules: webpack.RuleSetRule[] = []
let fileEntry = `${__dirname}/svg-data/index.js`

interface Output {
    module: { [index: string]: string }
    dts: string
}

describe("Test SVG Plugin resource", () => {

    afterAll(() => {
        let gl = new GlobSync(`${__dirname}/svg-data/**/*.d.ts`)
        gl.found.forEach(file => {
            unlinkSync(file)
        })

        Utils.removeDir(`${__dirname}/svg-data/out`)
    })

    test("Default plugins", async () => {
        let plugin = PluginFactory.getPlugins({
            glob: `${__dirname}/svg-data/icons/*.svg`
        })

        let stats = await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin])
        stats.toJson().modules!.forEach((mod: any) => {
            let name = basename(mod.name as string)
            let ext = extname(name)
            if (ext == "js") {
                let index = name.indexOf(".")
                let filename = name.substring(0, index)
                let result = eval(mod.source) as ResourceModule
                expect(result.files).toBeTruthy()
                expect(result.files).toStrictEqual([`${__dirname}/svg-data/icons/${name}`])
                expect(result.resModule).toBeTruthy()
                let output = TestCaseHelper.ReadOutputExpected<Output>(`${__dirname}/svg-data/icons/${filename}.expect.yml`)
                expect(result.resModule).toStrictEqual(output.module)
                expect(result.rawContent).toBeTruthy()
                expect(existsSync(`${__dirname}/svg-data/icons/${filename}.d.ts`))
                let relatitvePath = relative(mod.name as string, process.cwd())
                expect(readFileSync(`${__dirname}/svg-data/icons/${filename}.d.ts`)).toStrictEqual(output.dts.replace("{@module}", relatitvePath))
            }
        })
    })

    test("Output Directory", async () => {
        let plugin = PluginFactory.getPlugins({
            glob: `${__dirname}/svg-data/icons/*.svg`,
            output: `${__dirname}/svg-data/out/dts`
        })

        await WebpackUtil.run(fileEntry, moduleRules, [plugin], [plugin])

        let dtsDir = `${__dirname}/svg-data/out/dts`

        let gl = new GlobSync(`${__dirname}/svg-data/icons/*.svg`)
        gl.found.forEach(file => {
            // verify typed generated
            let name = basename(file)
            let index = name.indexOf(".")
            let filename = name.substring(0, index)
            expect(existsSync(`${dtsDir}/${name}.d.ts`)).toStrictEqual(true)
            let output = TestCaseHelper.ReadOutputExpected<Output>(`${__dirname}/svg-data/icons/${filename}.expect.yml`)
            let dtsMod = output.dts.replace("{@module}", relative(process.cwd(), `${__dirname}/svg-data/icons/${filename}.svg`))
            expect(readFileSync(`${dtsDir}/${filename}.svg.d.ts`).toString()).toStrictEqual(dtsMod)
        });
    })

    test("Merge Svg file", async () => {
        let plugin = PluginFactory.getPlugins({
            glob: `${__dirname}/svg-data/all-icons/*.svg`,
            merge: [`${__dirname}/svg-data/all-icons/`]
        })

        let stats = await WebpackUtil.run(`${__dirname}/svg-data/index.merge.js`, moduleRules, [plugin], [plugin])
        let modules = stats.toJson().modules
        expect(modules).toBeTruthy()
        modules!.forEach((mod: any) => {
            let name = basename(mod.name)
            if (name === "all-icons.d.js") {
                let result = eval(mod.source) as ResourceModule
                expect(result).toBeTruthy()
                let output = TestCaseHelper.ReadOutputExpected<Output>(`${__dirname}/svg-data/all-icons/module.expect.yml`)
                let clone = Object.assign({}, result)
                delete clone.__description
                expect(clone).toStrictEqual(output.module)

                expect(result.__description).toBeTruthy()
                expect(result.__description!.files.length).toEqual(4)

                expect(result.__description!.rawContent).toBeTruthy()
                let svg = new SvgModuleParser({includeMeta: true}).parse(result.__description!.rawContent)
                expect(svg!.metadata.elementType).toStrictEqual(SvgElementType.SVG)
                expect(svg!.metadata).toBeTruthy()
                expect(svg!.metadata.childs).toBeTruthy()
                // after svg element there should only be child element, a def element
                expect(svg!.metadata.childs!.length).toEqual(1)
                expect(svg!.metadata.childs![0].childs!).toBeTruthy()
                // at least 4 element from svg test file should be included
                expect(svg!.metadata.childs![0].childs!.length).toBeGreaterThanOrEqual(4)
                let mergeEleIds = new Map()
                for (var key in output.module) {
                    if (output.module.hasOwnProperty(key)) {
                        mergeEleIds.set(key, true)
                    }
                }
                svg!.metadata.childs![0].childs!.forEach(item => {
                    if (item.elementType === SvgElementType.SYMBOL) {
                        expect(item['id']).toBeTruthy()
                        expect(mergeEleIds.get(item['id'])).toBeTruthy()
                        mergeEleIds.delete(item['id'])
                    }
                })
                expect(mergeEleIds.size).toEqual(0)
            }
        })
    })

})  