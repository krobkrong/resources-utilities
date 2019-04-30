import { CommandLineOptions } from "@resmod/cli/dts";
import { VectorUtils } from "@resmod/vector/parser";
import { DTSGenerator, DTSMeta } from "@resmod/cli/generator";
import { SerializeSvgResourceMetadata } from "@resmod/vector/svg";

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

   /** Overrided to open svg tag */
   public begin(): void {
      super.begin()
      this.mergeResource("<svg><def>\n")
   }

   /** Overrided to close svg tag */
   public commit(dtsMeta: DTSMeta): void {
      this.mergeResource("</def></svg>")
      super.commit(dtsMeta)
   }

   /**
    * Generate typescript definition from the given raw svg and definition metadata.
    * @param raw raw svg vector
    * @param dtsMeta an optional typescript definition metadata
    */
   generate(raw: string, secondaryId: string, dtsMeta?: DTSMeta): void {
      let resource = VectorUtils.parse(raw, {
         convension: this.options.convension,
         includeMeta: true
      })
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         if (!this.inTransaction()) {
            this.commitInternal(dtsMeta!)
         } else if (this.isSaveMerge()) {
            this.mergeResource(SerializeSvgResourceMetadata(resource!.metadata, secondaryId))
         }
      } else {
         console.log('Warning: svg resource does not contain any id')
      }
   }

}