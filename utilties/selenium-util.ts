#!/usr/bin/env node

import { existsSync, createWriteStream, unlinkSync } from 'fs'
import { get } from 'http'
import { platform } from 'os'
import { resolve } from 'path'

import * as yargs from 'yargs'
import * as readline from 'readline'
import unzipper from 'extract-zip'

if (process.env.CI_ALPINE_BUILD) {
    process.exit(0)
}

var argv = yargs.scriptName("selenium-util")
    .usage("\n$0 -d directory")
    //
    .string("d")
    .describe("d", "directory where driver should be store and cache.")
    //
    .argv

if (existsSync(`${argv.d!}/chromedriver`)) process.exit(0)

let extractZip = async (path: string, resolvePromise?: (value?: unknown) => void) => {
    unzipper(path, { dir: resolve(`${argv.d}`) }, (err) => {
        if (err) throw err
        if (resolvePromise) resolvePromise()
        unlinkSync(path)
    })
}

let chromVersion = '77.0.3865.10'
let chromeDriverPath = `${argv.d!}/chrome`
if (!existsSync(chromeDriverPath)) {
    let download = async () => {
        let promise = new Promise(resolve => {
            console.log("Loading Chrome driver")
            let suffix: string
            switch (platform()) {
                case "darwin":
                    suffix = "mac64"
                    break
                case "win32":
                    suffix = "win32"
                    break
                case "linux":
                    suffix = "linux64"
            }

            let total_bytes = 0
            let receive_bytes = 0

            let url = `http://chromedriver.storage.googleapis.com/${chromVersion}/chromedriver_${suffix!}.zip`
            get(url, (response) => {
                total_bytes = parseInt(response.headers['content-length']!);
                let file = createWriteStream(chromeDriverPath)
                response.on('data', (chunk) => {
                    receive_bytes += chunk.length
                    file.write(chunk)
                    var percentage = ((receive_bytes * 100) / total_bytes).toFixed(2)
                    readline.cursorTo(process.stdout, 0);
                    process.stdout.write(`loading: ${percentage}%`)
                })
            })
                .on('close', () => {
                    process.stdout.write(`\n`)
                    extractZip(chromeDriverPath, resolve)
                })
        })
        await promise
    }
    download()
} else {
    extractZip(chromeDriverPath)
}