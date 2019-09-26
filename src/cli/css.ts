import { CommandLineOptions } from "@resmod/cli/dts";
import { StyleUtils, CssParseOptions } from "@resmod/style/parser";
import { DTSGenerator, DTSMeta, GeneratedResult } from "@resmod/cli/generator";

/**
 * A class that generate typescript definition from the given raw css stylesheet.
 */
export class CssDTSGenerator extends DTSGenerator {

   private cssOpts: CssParseOptions

   /**
    * Create css stylesheet generator
    * @param opt command line option
    */
   constructor(opt: CommandLineOptions, cssOpts?: CssParseOptions) {
      super(opt)
      this.cssOpts = Object.assign({}, {
         convension: this.options.convension,
         cssClass: true,
         cssId: true,
         cssVariable: true
      }, cssOpts)
   }

   /**
    * Generate typescript definition from the given raw css and definition metadata.
    * @param raw raw css stylesheet
    * @param dtsMeta an optional typescript definition metadata.
    */
   doGenerate(raw: string, name: string, _?: boolean, dtsMeta?: DTSMeta): GeneratedResult | undefined {
      let resource = StyleUtils.parse(raw, this.cssOpts)
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         let combindModule = this.getResourceModule()
         if (!this.inTransaction()) {
            console.log(`resource: ${name}${dtsMeta!.extension} generated.`)
            return this.commitInternal(dtsMeta!)
         } else if (this.isMerge()) {
            this.mergeResource(resource!.metadata["raw"] as string)
         }
         return { resModule: combindModule, raw: resource!.metadata["raw"] as string }
      } else {
         console.log(`Warning: resource does not contain any id, class or variable.`)
         return undefined
      }
   }

}