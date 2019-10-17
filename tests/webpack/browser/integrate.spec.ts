import { SerializeSvgResourceMetadata, SvgModuleParser } from "@resmod/vector/svg";
import { PluginFactory } from "@resmod/webpack/plugins/factory";
import { IGeneratedMetadata } from "@resmod/webpack/plugins/plugin";
import { Utils } from "@test-helper/util";
import { ChildProcess, exec } from "child_process";
import { readFileSync } from "fs";
import { GlobSync } from "glob";
import { renderSync } from "node-sass";
import { delimiter, join } from "path";
import selenium from "selenium-webdriver";
import { Options } from "selenium-webdriver/chrome";
import { waitUntilUsed } from "tcp-port-used";

let driver: selenium.WebDriver;
let childProcJs: ChildProcess;
let childProcTs: ChildProcess;

const createDriver = async () => {
    const pref = new selenium.logging.Preferences();
    pref.setLevel(selenium.logging.Type.BROWSER, selenium.logging.Level.ALL);
    let options = new Options()
        .headless()
        .detachDriver(false).setLoggingPrefs(pref) as Options;
    if (process.env.CI_ALPINE_BUILD) {
        options = options
            .setChromeBinaryPath("/usr/bin/chromium-browser")
            .addArguments("--no-sandbox", "--disable-gpu", "--disable-software-rasterizer", "--disable-dev-shm-usage");
    } else {
        process.env.PATH = join(__dirname, "drivers") + delimiter + process.env.PATH;
    }
    try {
        driver = await new selenium.Builder()
            .forBrowser("chrome")
            .setChromeOptions(options)
            .build();
    } catch (e) {
        throw new Error("Error while trying to build the selenium webdriver");
    }
    expect(driver).toBeTruthy();
};
createDriver();

afterAll(async () => {
    try {
        await driver.close();
        await driver.quit().finally();
    } catch (e) {
        throw new Error("Error while trying to quit the driver");
    }
});

const testMergeSvg = async (port: number) => {
    await waitUntilUsed(port, 100, 12500);
    await driver.get(`http://localhost:${port}/`);
    const result = await driver.executeScript("return window.getSvgEmbeddedElement()");
    expect(Array.isArray(result)).toBe(true);
    const listEle = result as selenium.WebElement[];
    expect(listEle.length).toEqual(4);
    const ids = new Map([
        ["animal", { tag: "g", file: `${__dirname}/www/resources/icons/animal.svg` }],
        ["bell", { tag: "path", file: `${__dirname}/www/resources/icons/bell.svg` }],
        ["picin", { tag: "g", file: `${__dirname}/www/resources/icons/picin.svg` }],
        ["moon", { tag: "path", file: `${__dirname}/www/resources/icons/moon.svg` }],
    ]);

    const svgParser = new SvgModuleParser({ includeMeta: true });
    // left glob empty, we only need access to the optimize svgo
    const pluginSvg = PluginFactory.getPlugins({ glob: "", merge: [""], cleanSvgPresentationAttr: true });
    for (const ele of listEle) {
        const tag = await ele.getTagName();
        const id = await ele.getAttribute("id");
        expect(tag).toStrictEqual("symbol");
        const svgInfo = ids.get(id);
        expect(svgInfo).toBeTruthy();
        ids.delete(id);

        const allChild = await ele.findElements(selenium.By.xpath("./*"));
        expect(allChild).toBeTruthy();
        expect(allChild.length).toEqual(1);
        expect(await allChild[0].getTagName()).toStrictEqual(svgInfo!.tag);

        const svgMod = svgParser.parse(readFileSync(svgInfo!.file).toString());
        for (const child of svgMod!.metadata.childs!) {
            if (child.id === id) {
                const rawSvg = SerializeSvgResourceMetadata(svgMod!.metadata, { merge: true });
                const optRawSvg = await pluginSvg.optimizeSvg(rawSvg);
                const optMod = svgParser.parse(`<svg><def>${optRawSvg}</def></svg>`);
                const htmlText = await ele.getAttribute("innerHTML");
                const mod = svgParser.parse(`<svg>${htmlText.trim()}</svg>`);
                expect(Utils.IsResourceMetadataEqual(
                    mod!.metadata.childs![0],
                    optMod!.metadata.childs![0].childs![0].childs![0], true)).toBe(true);
            }
        }
    }

    const resMod = await driver.executeScript("return window.getSvgDts()") as {
        [index: string]: string | IGeneratedMetadata;
    };
    expect(resMod).toBeTruthy();
    expect(resMod.__description).toBeTruthy();
};

const testMergeCss = async (port: number) => {
    await waitUntilUsed(port, 100, 1500);
    await driver.get(`http://localhost:${port}/`);
    const result = await driver.executeScript("return window.getCssEmbeddedElement()");
    expect(typeof result).toStrictEqual("string");
    let content: string = "";
    const gs = new GlobSync(`${__dirname}/www/resources/styles/*.{css,scss,sass}`);
    for (const fp of gs.found) {
        if (fp.endsWith(".css")) { content += readFileSync(fp).toString(); } else {
            content += renderSync({ file: fp }).css.toString();
        }
    }
    expect(result).toEqual(content);

    const resMod = await driver.executeScript("return window.getCssDts()") as {
        [index: string]: string | IGeneratedMetadata;
    };
    expect(resMod).toBeTruthy();
    expect(resMod.__description).toBeTruthy();
};

describe("Test Webpack JS Integration", () => {

    beforeAll(async () => {
        childProcJs = exec(`yarn start:js:merge`, { cwd: `${__dirname}/www` });
    });

    afterAll(async () => {
        childProcJs.kill();
    });

    test("test svg embedded data", async () => {
        await testMergeSvg(8082);
    });

    test("test css embedded data", async () => {
        await testMergeCss(8082);
    });

});

describe("Test Webpack Typescript Integration", () => {

    beforeAll(async () => {
        childProcTs = exec(`yarn start:ts:merge`, { cwd: `${__dirname}/www` });
    });

    afterAll(async () => {
        childProcTs.kill();
    });

    test("test svg embedded data", async () => {
        await testMergeSvg(8083);
    }, 12500);

    test("test css embedded data", async () => {
        await testMergeCss(8083);
    });

});
