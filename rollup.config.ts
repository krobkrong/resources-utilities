import commonjs from "rollup-plugin-commonjs";
import executable from "rollup-plugin-executable";
import replace from "rollup-plugin-replace";
import typescript from "rollup-plugin-typescript";

export default [
   // command line
   {
      input: "src/cli/resutil.ts",
      output: {
         banner: "#!/usr/bin/env node",
         file: "dist/cli/resutil.js",
         format: "cjs",
      },
      plugins: [
         replace({
            "#!/usr/bin/env node": "",
            "delimiters": ["", ""],
         }),
         typescript({ outDir: "dist/" }),
         commonjs({ extensions: [".js", ".ts"] }), // the ".ts" extension is required
         executable(),
      ],
   },
   // bundling all js file
   {
      input: "build/index.js",
      output: {
         file: "dist/index.js",
         format: "cjs",
         name: "ResourcesUtil",
      },
      plugins: [
         commonjs({
            extensions: [".js"],
            ignore: ["conditional-runtime-dependency"],
         }),
      ],
   },
];
