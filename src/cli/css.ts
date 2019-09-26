import { CommandLineOptions } from "@resmod/cli/dts";
import { StyleUtils, CssParseOptions } from "@resmod/style/parser";
import { DTSGenerator, DTSMeta } from "@resmod/cli/generator";
import { ResourceModule } from "@resmod/webpack/loader/types";

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
   generate(raw: string, name: string, _?: boolean, dtsMeta?: DTSMeta): ResourceModule | undefined {
      let resource = StyleUtils.parse(raw, this.cssOpts)
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         let module = this.getResourceModule()
         if (!this.inTransaction()) {
            this.commitInternal(dtsMeta!)
            console.log(`resource: ${name}${dtsMeta!.extension} generated.`)
         } else if (this.isMerge()) {
            // TODO: add comment merge in dev mode
            this.mergeResource(resource!.metadata["raw"] as string)
         }
         return module
      } else {
         console.log(`Warning: resource does not contain any id, class or variable.`)
         return undefined
      }
   }

}