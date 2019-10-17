import { ICommandLineOptions } from "@resmod/cli/dts";
import { mkdirSyncRecursive } from "@resmod/common/file";
import {
   IResourceModule,
   SerializeResourceModule,
   SerializeResourceModuleAsVariable,
} from "@resmod/webpack/loader/types";
import { existsSync, writeFileSync } from "fs";
import { basename, dirname, join, relative, resolve } from "path";

/**
 * Provide information about typescript definition such as module and location of file.
 */
export interface IDTSMeta {
   /** a file extension */
   extension: string;
   /** a module represent typescript module */
   module: string;
   /** generated file */
   genFile: string;
}

/**
 *
 */
export interface IGeneratedResult {
   resModule: IResourceModule | undefined;
   raw: string | undefined;
}

/**
 * interface to define function signature to generate definition file.
 */
export abstract class DTSGenerator {

   protected options: ICommandLineOptions;

   private resMod?: IResourceModule;
   private transaction: boolean = false;
   private mergeBuffer?: string;
   private raw?: string;

   /**
    * Create typescript definition generator
    * @param opt command line options
    */
   constructor(opt: ICommandLineOptions) {
      this.options = opt;
   }

   /**
    * Begin transaction to parse multiple resources and generated
    * when call commit. It is design to be used with merge command line options.
    */
   public begin(): void {
      this.transaction = true;
      if (this.isMerge()) {
         this.mergeBuffer = "";
      }
   }

   /**
    * Finilize the generated code and generate a definition file.
    * It is design to be used with merge command line options.
    * @param dtsMeta dts metadata
    */
   public commit(dtsMeta: IDTSMeta): IGeneratedResult {
      if (this.isSaveMerge()) { this.saveMergeResource(dtsMeta); }
      return this.commitInternal(dtsMeta);
   }

   /**
    * Get current stat of resource module. The resource module may change upon
    * calling method `setResourceModule`.
    */
   public getResourceModule(): IResourceModule | undefined {
      return this.resMod;
   }

   /**
    * Get current buffer
    */
   public getMergeResource(): string | undefined {
      return this.mergeBuffer;
   }

   /**
    * Generate definition file base on the given options. If the transaction is inactive
    * the dtsMeta argument is required to generate a definition file otherwise it will be ignored.
    * @param options command line options
    * @param dtsMeta dts metadata
    */
   public generate(
      raw: string,
      secondaryId: string,
      useSecondary?: boolean,
      dtsMeta?: IDTSMeta): IGeneratedResult | undefined {
      this.raw = raw;
      return this.doGenerate(raw, secondaryId, useSecondary, dtsMeta);
   }

   /**
    *
    */
   public populateCache(result: IGeneratedResult) {
      this.setResourceModule(result.resModule!);
      if (!this.inTransaction()) {
         throw new Error("Generator expect cache to be use with merge resource only");
      } else if (this.isMerge()) {
         this.mergeResource(result.raw!);
      }
   }

   /**
    * Check whether the current parsing option is requesting save merge resources.
    */
   protected isSaveMerge(): boolean {
      return this.options.merge === true && this.options.save !== undefined;
   }

   /**
    * Check whether the current option is requesting merge resources.
    */
   protected isMerge(): boolean {
      return this.options.merge === true;
   }

   /**
    * check whether a transaction is already began
    */
   protected inTransaction(): boolean {
      return this.transaction;
   }

   /**
    *
    * @param raw
    * @param secondaryId
    * @param useSecondary
    * @param dtsMeta
    */
   protected abstract doGenerate(
      raw: string,
      secondaryId: string,
      useSecondary?: boolean,
      dtsMeta?: IDTSMeta): IGeneratedResult | undefined;

   /**
    * Update existing resource if available otherwise a new resource module is created
    * @param resMod resource module
    */
   protected setResourceModule(resMod: IResourceModule) {
      this.resMod = Object.assign({}, this.resMod, resMod);
   }

   /**
    * Merge s raw resources to exist buffer
    * @param s raw string resource to be merged
    */
   protected mergeResource(s: string) {
      if (this.isMerge()) {
         this.mergeBuffer! += s;
      }
   }

   /**
    * finalize the parsing stage and write typescript definition code into d.ts file.
    * @param dtsMeta typescript definition metadata
    */
   protected commitInternal(dtsMeta: IDTSMeta): IGeneratedResult {
      let moduleName = dtsMeta.module;
      if (this.options.alias) {
         const reverseAlias = this.options.alias;
         const absModPath = resolve(moduleName);
         for (const key of Object.keys(reverseAlias)) {
            if (absModPath.startsWith(key)) {
               const codeAlias = reverseAlias[key];
               const suffix = relative(key, absModPath);
               if (codeAlias) { moduleName = `${codeAlias}/${suffix}`; }
            }
         }
      }

      if (moduleName.endsWith("/")) {
         moduleName = moduleName.substr(0, moduleName.length - 1);
      }

      let doNotModifiedComment = "// ************************************************************************\n";
      doNotModifiedComment += "// Code generated by @krobkrong/resources-utilities module. DO NOT EDIT.\n";
      doNotModifiedComment += "// ************************************************************************\n\n";

      let content = doNotModifiedComment;
      content += `declare module "${moduleName}" {\n${SerializeResourceModule(this.resMod!)}}\n`;
      const dir = dirname(dtsMeta.genFile!);
      if (!existsSync(dir)) {
         mkdirSyncRecursive(dir);
      }
      writeFileSync(dtsMeta.genFile!, content);
      // write dts output base on tsconfig.json
      const configFile = resolve("tsconfig.json");
      if (existsSync(configFile)) {
         const tsconfig = require(configFile);
         if (tsconfig.compilerOptions &&
            tsconfig.compilerOptions.declaration &&
            tsconfig.compilerOptions.declarationDir) {

            const rootOutputDir = tsconfig.compilerOptions.declarationDir;
            const file = `${join(rootOutputDir, moduleName.substring(moduleName.indexOf("/") + 1))}.d.ts`;
            const subDir = dirname(file);
            if (!existsSync(subDir)) {
               mkdirSyncRecursive(subDir);
            }
            content = doNotModifiedComment;
            content += `declare var mod: {\n${SerializeResourceModuleAsVariable(this.resMod!)}}\nexport default mod;`;
            writeFileSync(file, content);
         }
      }

      const cloneModule = Object.assign({}, this.resMod);
      const cloneMerge = this.isMerge() ? this.mergeBuffer : this.raw;

      // reset module and merge content
      this.resMod = {};
      this.mergeBuffer = undefined;
      this.raw = undefined;

      return { resModule: cloneModule, raw: cloneMerge };
   }

   /** save merged content into a file with .mod.ext */
   private saveMergeResource(dtsMeta: IDTSMeta) {
      const filename = this.options.save === "." ?
         `${dtsMeta.module!}/${basename(dtsMeta.module!)}.mod${dtsMeta.extension}` :
         this.options.save!;
      const dir = dirname(filename);
      if (!existsSync(dir)) { mkdirSyncRecursive(dir); }
      writeFileSync(filename, this.mergeBuffer!);
   }

}
