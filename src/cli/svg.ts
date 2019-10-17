import { ICommandLineOptions } from "@resmod/cli/dts";
import { DTSGenerator, IDTSMeta, IGeneratedResult } from "@resmod/cli/generator";
import { IVectorParseOptions, VectorUtils } from "@resmod/vector/parser";
import { SerializeSvgResourceMetadata } from "@resmod/vector/svg";

/**
 * A class that generate typescript definition from the given raw svg vector.
 */
export class SvgDTSGenerator extends DTSGenerator {

   private svgOpts: IVectorParseOptions;

   /**
    * Create svg generator
    * @param opt command line option
    */
   constructor(opt: ICommandLineOptions, svgOpts?: IVectorParseOptions) {
      super(opt);
      this.svgOpts = Object.assign({}, {
         convension: this.options.convension,
         includeMeta: true,
      }, svgOpts);
   }

   /** Overrided to open svg tag */
   public begin(): void {
      super.begin();
      this.mergeResource("<svg><def>\n");
   }

   /** Overrided to close svg tag */
   public commit(dtsMeta: IDTSMeta): IGeneratedResult {
      this.mergeResource("</def></svg>");
      return super.commit(dtsMeta);
   }

   /**
    * Generate typescript definition from the given raw svg and definition metadata.
    * @param raw raw svg vector
    * @param dtsMeta an optional typescript definition metadata
    */
   public doGenerate(
      raw: string,
      secondaryId: string,
      useSecondary: boolean = false,
      dtsMeta?: IDTSMeta): IGeneratedResult | undefined {
      const resource = VectorUtils.parse(raw, this.svgOpts);
      if (useSecondary) {
         resource!.resourceModule = {};
         resource!.resourceModule[secondaryId] = secondaryId;
      }
      let serializeRaw: string = "";
      if (resource) {
         this.setResourceModule(resource!.resourceModule);
         const combindModule = this.getResourceModule();
         if (!this.inTransaction()) {
            return this.commitInternal(dtsMeta!);
         } else if (this.isMerge()) {
            serializeRaw = SerializeSvgResourceMetadata(resource!.metadata, {
               id: secondaryId,
               merge: this.isMerge(),
               useGivenId: useSecondary,
            });
            this.mergeResource(serializeRaw);
         }
         return { resModule: combindModule, raw: serializeRaw };
      } else {
         return undefined;
      }
   }

}
