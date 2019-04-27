import { CommandLineOptions } from "@resmod/cli/dts";
import { StyleUtils } from "@resmod/style/parser";
import { DTSGenerator, DTSMeta } from "@resmod/cli/generator";

/**
 * A class that generate typescript definition from the given raw css stylesheet.
 */
export class CssDTSGenerator extends DTSGenerator {

   /**
    * Create css stylesheet generator
    * @param opt command line option
    */
   constructor(opt: CommandLineOptions) {
      super(opt)
   }

   /**
    * Generate typescript definition from the given raw css and definition metadata.
    * @param raw raw css stylesheet
    * @param dtsMeta an optional typescript definition metadata.
    */
   generate(raw: string, dtsMeta?: DTSMeta): void {
      let resource = StyleUtils.parse(raw, {
         convension: this.options.convension,
         cssClass: true,
         cssId: true,
         cssVariable: true
      })
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         if (!this.inTransaction()) {
            this.commitInternal(dtsMeta!)
         }
      } else {
         console.log(`Warning: ${dtsMeta!.extension} resource does not contain any id, class or variable.`)
      }
   }

}