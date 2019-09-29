import selenium from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome'
import { join, delimiter } from 'path'
import { ChildProcess, exec } from 'child_process';
import { waitUntilUsed } from 'tcp-port-used'
import { SvgModuleParser, SerializeSvgResourceMetadata } from '@resmod/vector/svg';
import { readFileSync } from 'fs';
import { Utils } from '@test-helper/helper';
import { GeneratedMetadata } from '@resmod/webpack/plugins/plugin'
import { GlobSync } from 'glob';
import { renderSync } from 'node-sass';
import { PluginFactory } from "@resmod/webpack/plugins/factory";


let driver: selenium.WebDriver
let childProcJs: ChildProcess
let childProcTs: ChildProcess

let createDriver = async () => {
    let pref = new selenium.logging.Preferences()
    pref.setLevel(selenium.logging.Type.BROWSER, selenium.logging.Level.ALL)
    let options = new Options()
        .headless()
        .detachDriver(false).setLoggingPrefs(pref) as Options
    if (process.env.CI_ALPINE_BUILD) {
        options = options
            .setChromeBinaryPath("/usr/bin/chromium-browser")
            .addArguments("--no-sandbox", "--disable-gpu", "--disable-software-rasterizer", "--disable-dev-shm-usage")
    } else {
        process.env.PATH = join(__dirname, 'drivers') + delimiter + process.env.PATH;
    }
    try {
        driver = await new selenium.Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build()
    } catch (e) {
        console.log("Error while trying to build the selenium webdriver", e)
    }
    expect(driver).toBeTruthy()
}
createDriver()

afterAll(async () => {
    try {
        await driver.close()
        await driver.quit().finally()
    } catch (e) {
        console.warn("Error while trying to quit the driver", e)
    }
})

let testMergeSvg = async (port: number) => {
    await waitUntilUsed(port, 100, 12500)
    await driver.get(`http://localhost:${port}/`)
    let result = await driver.executeScript("return window.getSvgEmbeddedElement()")
    expect(Array.isArray(result)).toBe(true);
    let listEle = result as Array<selenium.WebElement>
    expect(listEle.length).toEqual(4)
    let ids = new Map([
        ["animal", { tag: "g", file: `${__dirname}/www/resources/icons/animal.svg` }],
        ["bell", { tag: "path", file: `${__dirname}/www/resources/icons/bell.svg` }],
        ["picin", { tag: "g", file: `${__dirname}/www/resources/icons/picin.svg` }],
        ["moon", { tag: "path", file: `${__dirname}/www/resources/icons/moon.svg` }]
    ])

    let svgParser = new SvgModuleParser({ includeMeta: true })
    // left glob empty, we only need access to the optimize svgo
    let pluginSvg = PluginFactory.getPlugins({ glob: "", merge: [""], cleanSvgPresentationAttr: true });
    for (let ele of listEle) {
        let tag = await ele.getTagName()
        let id = await ele.getAttribute("id")
        expect(tag).toStrictEqual("symbol")
        let svgInfo = ids.get(id)
        expect(svgInfo).toBeTruthy()
        ids.delete(id)

        let allChild = await ele.findElements(selenium.By.xpath("./*"))
        expect(allChild).toBeTruthy()
        expect(allChild.length).toEqual(1)
        expect(await allChild[0].getTagName()).toStrictEqual(svgInfo!.tag)

        let svgMod = svgParser.parse(readFileSync(svgInfo!.file).toString())
        for (let child of svgMod!.metadata.childs!) {
            if (child["id"] === id) {
                let rawSvg = SerializeSvgResourceMetadata(svgMod!.metadata, { merge: true });
                let optRawSvg = await pluginSvg.optimizeSvg(rawSvg);
                let optMod = svgParser.parse(`<svg><def>${optRawSvg}</def></svg>`);
                let htmlText = await ele.getAttribute("innerHTML");
                let mod = svgParser.parse(`<svg>${htmlText.trim()}</svg>`);
                expect(Utils.IsResourceMetadataEqual(
                    mod!.metadata.childs![0],
                    optMod!.metadata.childs![0].childs![0].childs![0], true)).toBe(true);
            }
        }
    }

    let resMod = await driver.executeScript("return window.getSvgDts()") as { [index: string]: string | GeneratedMetadata }
    expect(resMod).toBeTruthy()
    expect(resMod["__description"]).toBeTruthy()
}

let testMergeCss = async (port: number) => {
    await waitUntilUsed(port, 100, 1500)
    await driver.get(`http://localhost:${port}/`)
    let result = await driver.executeScript("return window.getCssEmbeddedElement()")
    expect(typeof result).toStrictEqual("string");
    let content: string = ""
    let gs = new GlobSync(`${__dirname}/www/resources/styles/*.{css,scss,sass}`)
    for (let fp of gs.found) {
        if (fp.endsWith(".css")) content += readFileSync(fp).toString()
        else content += renderSync({ file: fp }).css.toString()
    }
    expect(result).toEqual(content)

    let resMod = await driver.executeScript("return window.getCssDts()") as { [index: string]: string | GeneratedMetadata }
    expect(resMod).toBeTruthy()
    expect(resMod["__description"]).toBeTruthy()
}

describe("Test Webpack JS Integration", () => {

    beforeAll(async () => {
        childProcJs = exec(`yarn start:js:merge`, { cwd: `${__dirname}/www` })
    })

    afterAll(async () => {
        childProcJs.kill()
    })

    test("test svg embedded data", async () => {
        await testMergeSvg(8082)
    })

    test("test css embedded data", async () => {
        await testMergeCss(8082)
    })

})

describe("Test Webpack Typescript Integration", () => {

    beforeAll(async () => {
        childProcTs = exec(`yarn start:ts:merge`, { cwd: `${__dirname}/www` })
    })

    afterAll(async () => {
        childProcTs.kill()
    })

    test("test svg embedded data", async () => {
        await testMergeSvg(8083)
    }, 12500)

    test("test css embedded data", async () => {
        await testMergeCss(8083)
    })

})