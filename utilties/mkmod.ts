#!/usr/bin/env node

import { mkdirSync, readdirSync, lstatSync, readlinkSync, symlinkSync, createReadStream, createWriteStream } from "fs";
import { join } from "path";

let copy = function (src: string, dest: string) {
    var oldFile = createReadStream(src);
    var newFile = createWriteStream(dest);
    oldFile.pipe(newFile)
};

let copyDir = function (src: string, dest: string) {
    mkdirSync(dest, { recursive: true })
    var files = readdirSync(src);
    for (var i = 0; i < files.length; i++) {
        var current = lstatSync(join(src, files[i]));
        if (current.isDirectory()) {
            copyDir(join(src, files[i]), join(dest, files[i]));
        } else if (current.isSymbolicLink()) {
            var symlink = readlinkSync(join(src, files[i]));
            symlinkSync(symlink, join(dest, files[i]));
        } else {
            copy(join(src, files[i]), join(dest, files[i]));
        }
    }
};

let moduleDir = `${__dirname}/../tests/webpack/browser/www/node_modules/@krobkrong/resources-utilities`
let distDir = `${__dirname}/../dist`

copyDir(distDir, `${moduleDir}/dist`)
copy(`${__dirname}/../package.json`, `${moduleDir}/package.json`)