import { VectorParseOptions } from "@resmod/vector/parser";
import { CssParseOptions } from "@resmod/style/parser";
import webpack from "webpack";
import { GlobSync } from "glob";
import { Generate, CommandLineOptions, CommitCallback } from "@resmod/cli/dts";
import { resolve, dirname, basename } from "path";
import { statSync, writeFileSync, existsSync } from "fs";
import { ResourceModule } from "@resmod/webpack/loader/types";
import { tmpdir } from "os";
import { mkdirSyncRecursive } from "@resmod/common/file";

/**
 * Svg and Css parse options including command line options use to
 * customize how plugin generate module file.
 */
export interface ResourceParseOptions {
   svg?: VectorParseOptions
   css?: CssParseOptions
   cmd: CommandLineOptions
}

/**
 * Dts Generator options, to customize generator behavior.
 * 
 * **NOTE:** The asynchronous operation on file watcher is not guarantee that dts generator
 * will generate the valid dts file before webpack trigger the compile changed. Due to this reason
 * a plugin of webpack will ensure the dts file is guarantee generated before the compilation pharse.
 */
export interface DtsGeneratedOption {
   /**
    * A glob pattern to describe the location of the resources file
    * to be generated.
    */
   glob: string

   /**
    * an options to provide to generator when parse and generate dts file.
    */
   options?: ResourceParseOptions

   /**
    * Set it to true all allow generator to save parsed data into a temporary files that can
    * be reuse later pharse by loader that may required the same process to parse
    * the resources file. By default, cache is not enabled.
    */
   cache?: boolean

   /**
    * temporary folder to store the compiled data from the resources. This option is used together
    * with cache option. If cache options is disabled then `tmp` option is ignored.
    * By default, it will use platform's default temporary folder.
    */
   tmp?: string

   /**
    * Use either hash or date time to verified that the file has changed. If nether of them is set,
    * then generator will parse any resources file and generated the dts file accordingly.
    * To avoid unnecessary re-compiled resources when the file did not change, it's recommended to use
    * `date` options to skip unchanged file and it's more lighweight.
    * 
    * **NOTE:** Current webpack 4.+ does not provided any information to the plugin regarding of the file
    * changed that trigger webpack to re-compiled thus we have no choice but to check the `date`.
    */
   verifyChange?: "date"

}

/**
 * Webpack generator plugin, use to generate dts file on the file
 */
export class DtsGeneratorPlugin {

   protected dtsOpts: DtsGeneratedOption

   private session: Map<string, number>;
   private callback?: (files: string[]) => void

   /**
    * Create DTS generator plugin
    * @param options options to generate definition files
    * @param callback a callback to be call after file is generated, use as test helper only.
    */
   constructor(options: DtsGeneratedOption, callback?: (files: string[]) => void) {
      this.dtsOpts = options
      this.session = new Map()
      this.callback = callback
   }

   apply(compiler: webpack.Compiler): void {

      compiler.hooks.beforeCompile.tapAsync('generate', (_: any, callback: () => void) => {
         console.log('Generate d.ts module from resource.')

         let glob = new GlobSync(this.dtsOpts.glob)
         let modified: string[]
         if (this.dtsOpts.verifyChange === "date") {
            modified = []
            glob.found.forEach(file => {
               let key = resolve(file)
               let stats = statSync(key)
               if (this.session.get(key) !== undefined && this.session.get(key) === stats.mtime.getTime()) {
                  return
               }
               this.session.set(key, stats.mtime.getTime())
               modified.push(key)
            })
         } else {
            modified = glob.found
         }

         if (modified.length > 0) {

            let opts
            if (this.dtsOpts.options) {
               opts = this.dtsOpts.options
               opts.cmd.glob = modified
            } else {
               opts = {
                  cmd: {
                     merge: false,
                     convension: 'camel',
                     glob: modified
                  }
               } as ResourceParseOptions
            }


            try {
               let cacheHandler: CommitCallback | undefined = undefined
               if (this.dtsOpts.cache) {
                  let pkg = require(`${process.cwd()}/package.json`).name as string
                  cacheHandler = (files: string[], dtsFile: string, raw?: string, resmod?: ResourceModule) => {
                     let tmp = this.dtsOpts.tmp ? resolve(this.dtsOpts.tmp) : `${tmpdir()}/${pkg}/resources-utilities/cache`
                     let relativeDir = dirname(dtsFile).replace(`${process.cwd()}/`, "")
                     let filedir = `${tmp}/${relativeDir}`
                     let name = basename(dtsFile)
                     name = `${name.substring(0, name.indexOf("."))}.json`

                     let cacheObj = {
                        files: files,
                        dtsFile: dtsFile,
                        module: resmod,
                        raw: raw
                     }
                     if (!existsSync(filedir)) mkdirSyncRecursive(filedir)
                     console.log(`writing cache data at ${filedir}/${name}`)
                     writeFileSync(`${filedir}/${name}`, JSON.stringify(cacheObj))
                  }
               }
               Generate(opts.cmd, opts.svg, opts.css, cacheHandler)
            } catch (err) {
               console.log("Unable to generate types definition .d.ts file", err)
            } finally {
               if (this.callback) this.callback(modified)
            }
         }
         callback()
      });

   }

}