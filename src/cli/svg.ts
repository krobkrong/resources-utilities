import { CommandLineOptions } from "@resmod/cli/dts";
import { VectorUtils, VectorParseOptions } from "@resmod/vector/parser";
import { DTSGenerator, DTSMeta } from "@resmod/cli/generator";
import { SerializeSvgResourceMetadata } from "@resmod/vector/svg";
import { ResourceModule } from "@resmod/webpack/loader/types";

/**
 * A class that generate typescript definition from the given raw svg vector.
 */
export class SvgDTSGenerator extends DTSGenerator {

   private svgOpts: VectorParseOptions

   /**
    * Create svg generator
    * @param opt command line option
    */
   constructor(opt: CommandLineOptions, svgOpts?: VectorParseOptions) {
      super(opt)
      this.svgOpts = Object.assign({}, {
         convension: this.options.convension,
         includeMeta: true
      }, svgOpts)
   }

   /** Overrided to open svg tag */
   public begin(): void {
      super.begin()
      this.mergeResource("<svg><def>\n")
   }

   /** Overrided to close svg tag */
   public commit(dtsMeta: DTSMeta): { module: ResourceModule, rawMerge?: string } {
      this.mergeResource("</def></svg>")
      return super.commit(dtsMeta)
   }

   /**
    * Generate typescript definition from the given raw svg and definition metadata.
    * @param raw raw svg vector
    * @param dtsMeta an optional typescript definition metadata
    */
   generate(raw: string, secondaryId: string, dtsMeta?: DTSMeta): ResourceModule | undefined {
      let resource = VectorUtils.parse(raw, this.svgOpts)
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         let module = this.getResourceModule()
         if (!this.inTransaction()) {
            this.commitInternal(dtsMeta!)
            console.debug(`resource: ${secondaryId}${dtsMeta!.extension} generated.`)
         } else if (this.isMerge()) {
            // TODO: add comment merge in dev mode
            this.mergeResource(SerializeSvgResourceMetadata(resource!.metadata, secondaryId))
         }
         return module
      } else {
         console.warn('Warning: svg resource does not contain any id')
         return undefined
      }
   }

}