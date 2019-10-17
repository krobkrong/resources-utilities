#!/usr/bin/env node

import { createWriteStream, existsSync, unlinkSync } from "fs";
import { get } from "http";
import { platform } from "os";
import { resolve } from "path";

import unzipper from "extract-zip";
import * as readline from "readline";
import * as yargs from "yargs";

if (process.env.CI_ALPINE_BUILD) {
    process.exit(0);
}

const argv = yargs.scriptName("selenium-util")
    .usage("\n$0 -d directory")
    //
    .string("d")
    .describe("d", "directory where driver should be store and cache.")
    //
    .argv;

if (existsSync(`${argv.d!}/chromedriver`)) { process.exit(0); }

const extractZip = async (path: string, resolvePromise?: (value?: unknown) => void) => {
    unzipper(path, { dir: resolve(`${argv.d}`) }, (err) => {
        if (err) { throw err; }
        if (resolvePromise) { resolvePromise(); }
        unlinkSync(path);
    });
};

const chromVersion = "77.0.3865.10";
const chromeDriverPath = `${argv.d!}/chrome`;
if (!existsSync(chromeDriverPath)) {
    const download = async () => {
        const promise = new Promise((promiseResolve) => {
            let suffix: string;
            switch (platform()) {
                case "darwin":
                    suffix = "mac64";
                    break;
                case "win32":
                    suffix = "win32";
                    break;
                case "linux":
                    suffix = "linux64";
            }

            let totalBytes = 0;
            let receiveBytes = 0;

            const url = `http://chromedriver.storage.googleapis.com/${chromVersion}/chromedriver_${suffix!}.zip`;
            get(url, (response) => {
                totalBytes = parseInt(response.headers["content-length"]!, 10);
                const file = createWriteStream(chromeDriverPath);
                response.on("data", (chunk) => {
                    receiveBytes += chunk.length;
                    file.write(chunk);
                    const percentage = ((receiveBytes * 100) / totalBytes).toFixed(2);
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(`loading: ${percentage}%`);
                });
            })
                .on("close", () => {
                    process.stdout.write(`\n`);
                    extractZip(chromeDriverPath, promiseResolve);
                });
        });
        await promise;
    };
    download();
} else {
    extractZip(chromeDriverPath);
}
