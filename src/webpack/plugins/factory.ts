import { VectorElementType } from "@resmod/vector/types";
import { CssSelectorType } from "@resmod/style/types";
import { NameConvension } from "@resmod/common/convension";
import { GlobSync } from "glob";
import { statSync } from "fs";
import { relative, dirname, extname, resolve } from "path";
import { WebpackResourcePlugin } from "@resmod/webpack/plugins/plugin";
import webpack from "webpack";


/**
 * Dts Generator options, to customize generator behavior.
 * The plugin 
 * 
 * **NOTE:** The asynchronous operation on file watcher is not guarantee that dts generator
 * will generate the valid dts file before webpack trigger the compile changed. Due to this reason
 * a plugin of webpack will ensure the dts file is guarantee generated before the compilation pharse.
 */
export interface DtsGeneratorOptions {
   /**
    * A glob pattern to describe the location of the resources file
    * to be generated.
    */
   glob: string

   /**
    * a pattern either relative path, absolute path or a glob pattern. All matched folder 
    * will consider as a merged request.
    */
   merge?: string[]

   /**
    * The output directory of the definition file. If not specified then
    * the definition file will generate and store at the same location as resource file.
    */
   output?: string

   /**
    * Generate typescript variable with pre-define prefix base on resource element.
    */
   prefix?: boolean
   /**
    * a function to return your own prefix base on the given type.
    */
   prefixCb?: (element: VectorElementType | CssSelectorType) => string
   /**
    * name convension use to transform element id that use as typescript variable.
    * Note: `snake` and `Snake` is the same as snake case (use underscore) however
    * `Snake` product uppercase of all word where `snake` will produce only lowercase
    * of all word. Both transform to upper or lower case regardless of original name.
    */
   convension?: NameConvension
   /**
    * A custom function that provide transformation to variable name. Rather than using
    * the provided convensional, this is allow dev to provide their own custom convension.
    */
   convensionCb?: (name: string) => string
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
   /**
    * temporary folder to store the compiled data from the resources. This option is used together
    * with cache option. If cache options is disabled then `tmp` option is ignored.
    * By default, it will use platform's default temporary folder.
    */
   tmp?: string
   /**
    * specified whether the generate code in production should exclude style or svg injection.
    */
   excludeInject?: boolean
   /**
    * Use with svg resource only which which replace actual id of svg element with it filename instead.
    * This is useful when merging multiple svg file that export with redundant id.
    */
   mergeFilenameAsId?: boolean
}

/**
 * The file resources that need to be parse and computed to generate typed definition.
 */
export interface ResourceFiles {
   [index: string]: {
      merge: boolean
      extension: ResourceExtension
      relative: string
   }
}

/**
 * A state that indicate whether the resource inside the folder should be merged.
 */
export interface ResourceExtension {
   [index: string]: {
      files: string[]
   }
}

/**
 * Factory to create plugin for handling typescript definition generation and
 * custom resolve to generated file.
 */
export class PluginFactory {

   /**
    * Create new plugin instance to apply to Webpack configuration
    * @param options open to custom generated file
    */
   public static getPlugins(options: DtsGeneratorOptions): webpack.Plugin {
      if (options.convension === undefined) {
         options.convension = "camel"
         options.verifyChange = "date"
      }
      return new WebpackResourcePlugin(options)
   }

   /** look up based on the given glob to detect all resources files that eligible to generate typed definitions */
   public static getResourcesFiles(glob: string, mergePath?: string[]): ResourceFiles {

      let mergeMap = new Map<string, boolean>()
      if (mergePath) {
         for (let i = 0; i < mergePath.length; i++) {
            let pattern = mergePath[i].endsWith("/") ? mergePath[i] : `${mergePath[i]}/`
            let gl = new GlobSync(pattern)
            gl.found.forEach(fd => {
               if (statSync(fd).isDirectory()) {
                  mergeMap.set(resolve(fd), true)
               }
            })
         }
      }

      let resFiles = {} as ResourceFiles
      let gl = new GlobSync(glob, { nodir: true })

      gl.found.forEach(fd => {
         let dir = dirname(fd)
         let ext = extname(fd)
         if (resFiles[dir] === undefined) {
            let mergeDir = mergeMap.get(dir) === true
            resFiles[dir] = { merge: mergeDir, extension: {}, relative: relative(process.cwd(), dir) }
         }
         if (resFiles[dir].extension[ext] === undefined) {
            resFiles[dir].extension[ext] = { files: [] }
         }
         resFiles[dir].extension[ext].files.push(fd)
      })

      return resFiles
   }

}

