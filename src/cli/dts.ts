import { SvgDTSGenerator } from "@resmod/cli/svg";
import { CssDTSGenerator } from "@resmod/cli/css";
import { readFileSync } from "fs";
import { renderSync } from "node-sass"
import { NameConvension } from "@resmod/common/convension";
import { basename, dirname, extname } from "path";
import { DTSGenerator, DTSMeta, FileDtsGenerator } from "./generator";


/**
 * Command options for resource module command line.
 */
export interface CommandLineOptions {
   /**
    * If wrap is true then dts value will generated based on file name rather than
    * the element id from the svg file. This option must use together with merge option.
    * The useful case that suitable to use wrap is when you have multiple svg files where
    * each file is represent an icon.
    */
   wrap?: boolean

   /**
    * true if every resource or file in the folder should merge 
    * into a single modules otherwise the resource module will generate
    * the definition file for each resource file.
    */
   merge: boolean | undefined

   /**
    * Setting this value if you using alias or custom resolve in webpack.
    * This allow the generated code produce the correct import module which
    * is necessary to verify by typescript compiler.
    */
   alias?: {
      /**
       * an alias module that use as imported path.
       * For example: @module/data
       */
      module: string
      /**
       * an actual path to the file
       */
      path: string
   }

   /**
    * The output directory of the definition file. If not specified then
    * the definition file will generate and store at the same location as resource file.
    */
   output: string | undefined

   /**
    * The input data, can be a regular path or a glob syntax.
    */
   glob: string[]

   /**
    * a convension to generate variable name. Support 4 different case:
    * camel case, pascal case, snake case and Snake case.
    * **Note:** Snake case is an uppercase version of snake case
    */
   convension: NameConvension
}

/**
 * Generate dts file from the given resources.
 * @param options command line optinos
 */
export function Generate(options: CommandLineOptions): void {
   if (options.wrap) {
      if (!options.merge) {
         throw "wrap only use with merge option set to true."
      }
      generateWrapped(options)
      return
   }

   var cssGen: DTSGenerator | undefined
   var svgGen: DTSGenerator | undefined

   let mdir = new Map<string, string[]>()

   // group file by folder, it is simplified the merge process
   options.glob.forEach(file => {
      // group by extension
      let ext = extname(file)
      let key = `${dirname(file)}${ext}`
      if (mdir.get(key)) {
         mdir.get(key)!.push(file)
      } else {
         mdir.set(key, [file])
      }
      if (svgGen === undefined && ext === '.svg') {
         svgGen = new SvgDTSGenerator(options)
      } else if (cssGen === undefined && (ext === '.css' || ext === '.scss' || ext === '.sass')) {
         cssGen = new CssDTSGenerator(options)
      }
   })

   // generate dts
   let genDts = (file: string, ext: string, dtsMeta?: DTSMeta) => {
      switch (ext) {
         case ".svg":
            svgGen!.generate(readFileSync(file).toString(), dtsMeta)
            break

         case ".scss":
         case ".sass":
            cssGen!.generate(renderSync({ file: file }).css.toString(), dtsMeta)
            break

         case ".css":
            cssGen!.generate(readFileSync(file).toString(), dtsMeta)
            break

         default:
            throw "unsupported resources"
      }
   }

   let dtsMeta = {} as DTSMeta

   // loop through each folder to generate dts
   for (var [key, val] of mdir) {

      if (options.merge) {

         let ldot = key.lastIndexOf(".")
         dtsMeta.module = key.substring(0, ldot)
         if (!options.output) {
            dtsMeta.genFile = `${dtsMeta.module}/${basename(key)}.d.ts`
         } else {
            dtsMeta.genFile = `${options.output}/${basename(key)}.d.ts`
         }

         dtsMeta.extension = key.substr(ldot)
         let generator = dtsMeta.extension === '.svg' ? svgGen : cssGen

         generator!.begin()
         val.forEach(file => {
            genDts(file, dtsMeta.extension)
         })
         generator!.commit(dtsMeta)

      } else {

         // generate dts for each file
         val.forEach(file => {

            let ldot = file.lastIndexOf(".")

            if (!options.output) {
               let dir = dirname(file)
               let name = basename(file)
               let dotIn = name.lastIndexOf(".")
               dtsMeta.genFile = `${dir}/${name.substring(0, dotIn)}.d.ts`
            } else {
               let name = basename(file)
               let dotIn = name.lastIndexOf(".")
               dtsMeta.genFile = `${options.output}/${name.substring(0, dotIn)}.d.ts`
            }

            dtsMeta.module = file
            dtsMeta.extension = file.substr(ldot)

            genDts(file, dtsMeta.extension, dtsMeta)

         })
      }
   }
}

/**
 * Generate wrapped and merged dts file from a mixed of multiple resource such as SVG.
 * @param options command line options
 */
function generateWrapped(options: CommandLineOptions) {
   let mdir = new Map<string, string[]>()

   // group file by folder, it is simplified the merge process
   options.glob.forEach(file => {
      let key = dirname(file)
      if (mdir.get(key)) {
         mdir.get(key)!.push(file)
      } else {
         mdir.set(key, [file])
      }
      if (extname(file) !== '.svg') {
         throw "wrap should be use with svg vector resource."
      }
   })

   let dtsMeta = {} as DTSMeta
   var fileGen = new FileDtsGenerator(options)

   for (var [key, val] of mdir) {
      dtsMeta.module = key
      dtsMeta.extension = extname(val[0])
      if (!options.output) {
         dtsMeta.genFile = `${dtsMeta.module}/${basename(key)}${dtsMeta.extension}.d.ts`
      } else {
         dtsMeta.genFile = `${options.output}/${basename(key)}${dtsMeta.extension}.d.ts`
      }

      fileGen.begin()
      val.forEach(file => {
         fileGen.filename(file)
      })
      fileGen.commit(dtsMeta)
   }
}