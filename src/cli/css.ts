import { ICommandLineOptions } from "@resmod/cli/dts";
import { DTSGenerator, IDTSMeta, IGeneratedResult } from "@resmod/cli/generator";
import { ICssParseOptions, StyleUtils } from "@resmod/style/parser";

/**
 * A class that generate typescript definition from the given raw css stylesheet.
 */
export class CssDTSGenerator extends DTSGenerator {

   private cssOpts: ICssParseOptions;

   /**
    * Create css stylesheet generator
    * @param opt command line option
    */
   constructor(opt: ICommandLineOptions, cssOpts?: ICssParseOptions) {
      super(opt);
      this.cssOpts = Object.assign({}, {
         convension: this.options.convension,
         cssClass: true,
         cssId: true,
         cssVariable: true,
      } as ICssParseOptions, cssOpts);
   }

   /**
    * Generate typescript definition from the given raw css and definition metadata.
    * @param raw raw css stylesheet
    * @param dtsMeta an optional typescript definition metadata.
    */
   // @ts-ignore
   public doGenerate(raw: string, name: string, _?: boolean, dtsMeta?: IDTSMeta): IGeneratedResult | undefined {
      const resource = StyleUtils.parse(raw, this.cssOpts);
      if (resource) {
         this.setResourceModule(resource!.resourceModule);
         const combindModule = this.getResourceModule();
         if (!this.inTransaction()) {
            return this.commitInternal(dtsMeta!);
         } else if (this.isMerge()) {
            this.mergeResource(resource!.metadata.raw as string);
         }
         return { resModule: combindModule, raw: resource!.metadata.raw as string };
      } else {
         return undefined;
      }
   }

}
