[![npm][npm-beta]][npm-url]
[![npm][npm-latest]][npm-url]
[![test][test]][test-url]
[![coverage][cover]][cover-url]
[![node-sass][node-sass-version]][node-sass-version]
[![webpack][webpack-version]][webpack-version]

# resources-utilities
A command line and library to generate typescript definition file from CSS, SASS, SCSS or SVG file.

## Install

Using NPM
```bash
npm i -D @krobkrong/resources-utilities
```

Using Yarn
```bash
yarn add @krobkrong/resources-utilities -D
```

## Command Line Usage

Resource utilities provide a command line that accept the last argument with glob pattern input syntax. For example, the command line below will generate a typescript definition file from a CSS file in the current work directory:

```bash
resutil theme*.css
```

If you've a specific location to store typescript definition file then you can use output directory option:

```base
resutil -o types theme*.css
```

The command above will generate the typescript definition file in the folder types in the current working directory.

For more information run `resutil --help`


## APIs Usage

Resource utilities provided APIs for both CSS and SVG. The below code utilize `StyleUtils` namespace to parse raw css file:

```typescript
import { StyleUtils } from "@krobkrong/resources-utilities";

let resource = StyleUtils.parse(raw, {
   convension: "camel",
   cssClass: true,
   cssId: true,
   cssVariable: true
})
```

[npm-beta]: https://img.shields.io/npm/v/@krobkrong/resources-utilities/beta.svg
[npm-latest]: https://img.shields.io/npm/v/@krobkrong/resources-utilities/latest.svg
[npm-url]: https://www.npmjs.com/package/@krobkrong/resources-utilities

[test]: https://circleci.com/gh/krobkrong/resources-utilities.svg?style=svg
[test-url]: https://circleci.com/gh/krobkrong/resources-utilities

[cover]: https://codecov.io/gh/krobkrong/resources-utilities/branch/master/graph/badge.svg
[cover-url]: https://codecov.io/gh/krobkrong/resources-utilities

[node-sass-version]: https://img.shields.io/github/package-json/dependency-version/krobkrong/resources-utilities/node-sass.svg

[webpack-version]: https://img.shields.io/github/package-json/dependency-version/krobkrong/resources-utilities/webpack.svg