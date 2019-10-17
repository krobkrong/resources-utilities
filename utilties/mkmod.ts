#!/usr/bin/env node

import { createReadStream, createWriteStream, lstatSync, mkdirSync, readdirSync, readlinkSync, symlinkSync } from "fs";
import { join } from "path";

const copy = (src: string, dest: string) => {
    const oldFile = createReadStream(src);
    const newFile = createWriteStream(dest);
    oldFile.pipe(newFile);
};

const copyDir = (src: string, dest: string) => {
    mkdirSync(dest, { recursive: true });
    const files = readdirSync(src);
    for (const file of files) {
        const current = lstatSync(join(src, file));
        if (current.isDirectory()) {
            copyDir(join(src, file), join(dest, file));
        } else if (current.isSymbolicLink()) {
            const symlink = readlinkSync(join(src, file));
            symlinkSync(symlink, join(dest, file));
        } else {
            copy(join(src, file), join(dest, file));
        }
    }
};

const moduleDir = `${__dirname}/../tests/webpack/browser/www/node_modules/@krobkrong/resources-utilities`;
const distDir = `${__dirname}/../dist`;

copyDir(distDir, `${moduleDir}/dist`);
copy(`${__dirname}/../package.json`, `${moduleDir}/package.json`);
