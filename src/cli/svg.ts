import { CommandLineOptions } from "@resmod/cli/dts";
import { VectorUtils } from "@resmod/vector/parser";
import { DTSGenerator, DTSMeta } from "@resmod/cli/generator";

/**
 * A class that generate typescript definition from the given raw svg vector.
 */
export class SvgDTSGenerator extends DTSGenerator {

   /**
    * Create svg generator
    * @param opt command line option
    */
   constructor(opt: CommandLineOptions) {
      super(opt)
   }

   /**
    * Generate typescript definition from the given raw svg and definition metadata.
    * @param raw raw svg vector
    * @param dtsMeta an optional typescript definition metadata
    */
   generate(raw: string, dtsMeta?: DTSMeta): void {
      let resource = VectorUtils.parse(raw, {
         convension: this.options.convension,
      })
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         if (!this.inTransaction()) {
            this.commitInternal(dtsMeta!)
         }
      } else {
         console.log('Warning: svg resource does not contain any id')
      }
   }

}