/// <reference path="src/types/rollup.typescript.d.ts"/>

import typescript from 'rollup-plugin-typescript';
import commonjs from 'rollup-plugin-commonjs';
import executable from 'rollup-plugin-executable';
import replace from 'rollup-plugin-replace'

export default [
   // command line
   {
      input: 'src/cli/resutil.ts',
      plugins: [
         replace({
            delimiters: ['', ''],
            '#!/usr/bin/env node': ''
         }),
         typescript({ "outDir": "dist/" }),
         commonjs({ extensions: ['.js', '.ts'] }), // the ".ts" extension is required
         executable(),
      ],
      output: {
         banner: '#!/usr/bin/env node',
         format: "cjs",
         file: "dist/cli/resutil.js"
      }
   },
   // bundling all js file
   {
      input: 'build/index.js',
      plugins: [
         commonjs({
            extensions: ['.js'],
            ignore: ["conditional-runtime-dependency"]
         }),
      ],
      output: {
         name: "ResourcesUtil",
         format: "cjs",
         file: "dist/index.js"
      }
   }
]