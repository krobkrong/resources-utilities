import { ResourceModule, SerializeResourceModule } from "@resmod/webpack/loader/types";
import { CommandLineOptions } from "@resmod/cli/dts";
import { dirname, parse, basename, resolve, relative } from "path";
import { existsSync, writeFileSync } from "fs";
import { transformFileNameConvention } from "@resmod/common/convension";
import { mkdirSyncRecursive } from "@resmod/common/file";

/**
 * Provide information about typescript definition such as module and location of file.
 */
export interface DTSMeta {
   /** a file extension */
   extension: string
   /** a module represent typescript module */
   module: string
   /** generated file */
   genFile: string
}

/**
 * 
 */
export interface GeneratedResult {
   resModule: ResourceModule | undefined
   raw: string | undefined
}

/**
 * interface to define function signature to generate definition file.
 */
export abstract class DTSGenerator {

   private resMod?: ResourceModule
   private transaction: boolean = false
   private mergeBuffer?: string
   private raw?: string

   protected options: CommandLineOptions

   /**
    * Create typescript definition generator
    * @param opt command line options
    */
   constructor(opt: CommandLineOptions) {
      this.options = opt
   }

   /**
    * Begin transaction to parse multiple resources and generated
    * when call commit. It is design to be used with merge command line options.
    */
   public begin(): void {
      this.transaction = true
      if (this.isMerge()) {
         this.mergeBuffer = ""
      }
   }

   /**
    * Finilize the generated code and generate a definition file.
    * It is design to be used with merge command line options.
    * @param dtsMeta dts metadata
    */
   public commit(dtsMeta: DTSMeta): GeneratedResult {
      if (this.isSaveMerge()) this.saveMergeResource(dtsMeta)
      return this.commitInternal(dtsMeta)
   }

   /**
    * Get current stat of resource module. The resource module may change upon
    * calling method `setResourceModule`.
    */
   public getResourceModule(): ResourceModule | undefined {
      return this.resMod
   }

   /**
    * Get current buffer 
    */
   public getMergeResource(): string | undefined {
      return this.mergeBuffer
   }

   /**
    * Check whether the current parsing option is requesting save merge resources.
    */
   protected isSaveMerge(): boolean {
      return this.options.merge === true && this.options.save !== undefined
   }

   /**
    * Check whether the current option is requesting merge resources.
    */
   protected isMerge(): boolean {
      return this.options.merge === true
   }

   /**
    * check whether a transaction is already began
    */
   protected inTransaction(): boolean {
      return this.transaction
   }

   /**
    * Generate definition file base on the given options. If the transaction is inactive
    * the dtsMeta argument is required to generate a definition file otherwise it will be ignored.
    * @param options command line options
    * @param dtsMeta dts metadata
    */
   public generate(raw: string, secondaryId: string, useSecondary?: boolean, dtsMeta?: DTSMeta): GeneratedResult | undefined {
      this.raw = raw;
      return this.doGenerate(raw, secondaryId, useSecondary, dtsMeta)
   }

   /**
    * 
    * @param raw 
    * @param secondaryId 
    * @param useSecondary 
    * @param dtsMeta 
    */
   protected abstract doGenerate(raw: string, secondaryId: string, useSecondary?: boolean, dtsMeta?: DTSMeta): GeneratedResult | undefined

   /**
    * 
    */
   public populateCache(result: GeneratedResult) {
      this.setResourceModule(result.resModule!)
      if (!this.inTransaction()) {
         throw "Generator expect cache to be use with merge resource only";
      } else if (this.isMerge()) {
         this.mergeResource(result.raw!);
      }
   }

   /**
    * Update existing resource if available otherwise a new resource module is created
    * @param resMod resource module
    */
   protected setResourceModule(resMod: ResourceModule) {
      this.resMod = Object.assign({}, this.resMod, resMod)
   }

   /**
    * Merge s raw resources to exist buffer
    * @param s raw string resource to be merged
    */
   protected mergeResource(s: string) {
      if (this.isMerge()) {
         this.mergeBuffer! += s
      }
   }

   /**
    * finalize the parsing stage and write typescript definition code into d.ts file.
    * @param dtsMeta typescript definition metadata 
    */
   protected commitInternal(dtsMeta: DTSMeta): GeneratedResult {
      var moduleName = dtsMeta.module
      if (this.options.alias) {
         let reverseAlias = this.options.alias
         let absModPath = resolve(moduleName)
         for (let key of Object.keys(reverseAlias)) {
            if (absModPath.startsWith(key)) {
               let codeAlias = reverseAlias[key]
               let suffix = relative(key, absModPath)
               if (codeAlias) moduleName = `${codeAlias}/${suffix}`
            }
         }
      }

      if (moduleName.endsWith("/")) {
         moduleName = moduleName.substr(0, moduleName.length - 1)
      }

      let content = "// ************************************************************************\n"
      content += "// Code generated by @krobkrong/resources-utilities module. DO NOT EDIT.\n"
      content += "// ************************************************************************\n\n"
      content += `declare module "${moduleName}" {\n${SerializeResourceModule(this.resMod!)}}`
      let dir = dirname(dtsMeta.genFile!)
      if (!existsSync(dir)) {
         mkdirSyncRecursive(dir)
      }
      writeFileSync(dtsMeta.genFile!, content)
      let cloneModule = Object.assign({}, this.resMod)
      let cloneMerge = this.isMerge() ? this.mergeBuffer : this.raw

      // reset module and merge content
      this.resMod = {}
      this.mergeBuffer = undefined
      this.raw = undefined

      return { resModule: cloneModule, raw: cloneMerge }
   }

   /** save merged content into a file with .mod.ext */
   private saveMergeResource(dtsMeta: DTSMeta) {
      let filename = this.options.save === "." ?
         `${dtsMeta.module!}/${basename(dtsMeta.module!)}.mod${dtsMeta.extension}` :
         this.options.save!
      let dir = dirname(filename)
      if (!existsSync(dir)) mkdirSyncRecursive(dir)
      writeFileSync(filename, this.mergeBuffer!)
   }

}

/**
 * A class that implement typescript definition generator. It provide a method to generate
 * typescript definition from the file name rather than from the content of each resource.
 * This generator is being used with command line options wrap.
 */
export class FileDtsGenerator extends DTSGenerator {

   public filename(file: string): void {
      if (!this.inTransaction()) {
         throw 'Generator design to be use with merge option. Must call begin method first.'
      }
      let pp = parse(file)
      let rmod = {} as ResourceModule
      rmod[transformFileNameConvention(pp.name, this.options.convension)] = "string"
      this.setResourceModule(rmod)
   }

   //@ts-ignore
   public doGenerate(raw: string, secondaryId: string, dtsMeta?: DTSMeta | undefined): ResourceModule | undefined {
      throw new Error("Method not implemented.");
   }

}
