import { CommandLineOptions } from "@resmod/cli/dts";
import { VectorUtils, VectorParseOptions } from "@resmod/vector/parser";
import { DTSGenerator, DTSMeta, GeneratedResult } from "@resmod/cli/generator";
import { SerializeSvgResourceMetadata } from "@resmod/vector/svg";

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
   public commit(dtsMeta: DTSMeta): GeneratedResult {
      this.mergeResource("</def></svg>")
      return super.commit(dtsMeta)
   }

   /**
    * Generate typescript definition from the given raw svg and definition metadata.
    * @param raw raw svg vector
    * @param dtsMeta an optional typescript definition metadata
    */
   doGenerate(raw: string, secondaryId: string, useSecondary: boolean = false, dtsMeta?: DTSMeta): GeneratedResult | undefined {
      let resource = VectorUtils.parse(raw, this.svgOpts)
      if (useSecondary) {
         resource!.resourceModule = {}
         resource!.resourceModule[secondaryId] = secondaryId
      }
      let serializeRaw: string = ""
      if (resource) {
         this.setResourceModule(resource!.resourceModule)
         let combindModule = this.getResourceModule()
         if (!this.inTransaction()) {
            console.debug(`resource: ${dtsMeta!.genFile} generated.`)
            return this.commitInternal(dtsMeta!)
         } else if (this.isMerge()) {
            serializeRaw = SerializeSvgResourceMetadata(resource!.metadata, {
               merge: this.isMerge(),
               id: secondaryId,
               useGivenId: useSecondary
            })
            this.mergeResource(serializeRaw)
         }
         return { resModule: combindModule, raw: serializeRaw }
      } else {
         console.warn('Warning: svg resource does not contain any id')
         return undefined
      }
   }

}