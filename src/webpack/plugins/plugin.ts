import { DtsGeneratorOptions, ResourceFiles, PluginFactory } from "@resmod/webpack/plugins/factory";
import { CssDTSGenerator } from "@resmod/cli/css";
import { SvgDTSGenerator } from "@resmod/cli/svg";
import { DTSGenerator, DTSMeta } from "@resmod/cli/generator";
import { ResourceModule } from "@resmod/webpack/loader/types";
import { ExtResolver } from "@resmod/types/webpack";
import { transformFileNameConvention } from "@resmod/common/convension";
import { mkdirSyncRecursive } from "@resmod/common/file";

import { statSync, readFileSync, existsSync, writeFileSync } from "fs";
import webpack from "webpack";
import { renderSync } from "node-sass";

import { ResolverRequest, LoggingCallbackTools, LoggingCallbackWrapper } from "enhanced-resolve/lib/common-types";
import { basename, resolve, dirname, extname, relative } from "path";
import { tmpdir } from "os";



/**
 * 
 */
interface SessionCache {
   modified: number
   resModule?: ResourceModule
}

/**
 * 
 */
export interface GeneratedMetadata {
   resModule?: ResourceModule
   rawContent: string
   files: string[]
}

/**
 * 
 */
export class WebpackResourcePlugin {

   protected options: DtsGeneratorOptions
   protected resFiles!: ResourceFiles
   protected webpackAlias?: { [key: string]: string }
   protected reverseAlias?: { [key: string]: string }

   protected session: Map<string, SessionCache>
   protected generator: Map<string, DTSGenerator>
   protected root: string
   protected pkg: string

   constructor(options: DtsGeneratorOptions) {
      this.options = options
      this.session = new Map()
      this.generator = new Map()
      this.root = process.cwd()
      this.pkg = require(`${process.cwd()}/package.json`).name as string
   }

   /**
    * Implement webpack plugin method
    * @param pluginContext argument that provide by webpack
    */
   public apply(pluginContext: webpack.Compiler | ExtResolver): void {

      if (pluginContext.constructor.name === "Resolver") {
         this.applyWebpackResolverPlugin(pluginContext as ExtResolver)
      } else {
         this.applyWebpackPlugin(pluginContext as webpack.Compiler)
      }

   }

   /**  */
   private getAliasMatch(import_: string): string {
      if (this.webpackAlias !== undefined) {
         if (this.reverseAlias![import_]) {
            // match exactly, regardless of $ sign it's eligable
            let transformImport = this.reverseAlias![import_]
            if (transformImport.endsWith("$")) return transformImport.substr(0, transformImport.length - 1)
            return transformImport
         }
         // let find parent folder that match the file
         let dir
         do {
            dir = dirname(import_)
            if (this.reverseAlias![dir] && !this.reverseAlias![dir].endsWith("$")) {
               return this.reverseAlias![dir]
            }
         } while (dir === ".")
      }
      // not found any not transform
      return import_
   }

   private createDtsMeta(dir: string, name: string, merge: boolean): DTSMeta {
      let dm = { extension: extname(name) } as DTSMeta
      dm.module = merge ? dir.replace(`${this.root}/`, "") : `${dir.replace(`${this.root}/`, "")}/${name}`
      if (this.options.output) {
         dm.genFile = `${resolve(this.options.output!)}/${name}.d.ts`
      } else {
         dm.genFile = `${dir}/${name}.d.ts`
      }
      if (this.webpackAlias) {
         dm.module = this.getAliasMatch(dm.module)
      }
      return dm
   }

   /** */
   private cacheHandler(files: string[], dtsFile: string, raw?: string, resmod?: ResourceModule) {
      let tmp = this.options.tmp ? resolve(this.options.tmp) : `${tmpdir()}/${this.pkg}/resources-utilities/cache`
      let relativeDir = dirname(dtsFile).replace(`${process.cwd()}/`, "")
      let filedir = `${tmp}/${relativeDir}`
      let name = basename(dtsFile)
      name = `${name.substring(0, name.indexOf(".", name.indexOf(".") + 1))}.json`

      let cacheObj = {
         files: files,
         resModule: resmod,
         rawContent: raw
      } as GeneratedMetadata

      if (!existsSync(filedir)) mkdirSyncRecursive(filedir)
      console.log(`writing cache data at ${filedir}/${name}`)
      writeFileSync(`${filedir}/${name}`, JSON.stringify(cacheObj))
   }

   /** */
   private getGenerator(ext: string, merge: boolean): DTSGenerator {
      // any extension .css, .scss or .sass work fine with CssDTSGenerator
      ext = ext === ".svg" ? ext : ".css"
      let generator = this.generator.get(ext)
      if (generator === undefined) {
         let opts = {
            merge: merge,
            glob: [],
            convension: this.options.convension!
         }
         generator = ext === ".svg" ? new SvgDTSGenerator(opts) : new CssDTSGenerator(opts)
         this.generator.set(ext, generator)
      }
      return generator
   }

   /** */
   private generateTypes(dir: string, files: string[], merge: boolean, ext: string) {

      let dtsMetaFile: (file: string) => DTSMeta | undefined
      if (merge) {
         this.getGenerator(ext, merge).begin()
         // mock function when merge option is set
         dtsMetaFile = (_: string): DTSMeta | undefined => { return undefined }
      } else {
         dtsMetaFile = (file: string): DTSMeta => {
            return this.createDtsMeta(dir, basename(file), false)
         }
      }

      let generateDts = (file: string) => {
         let name = basename(file)
         name = transformFileNameConvention(name.substring(0, name.lastIndexOf(".")), this.options.convension!)
         let dtsMeta = dtsMetaFile(file)

         let result, raw
         let ext = extname(file)
         if (ext === ".scss" || ext === ".sass") {
            raw = renderSync({ file: file }).css.toString()
            result = this.getGenerator(ext, merge).generate(raw, name, dtsMeta)
         } else {
            raw = readFileSync(file).toString()
            result = this.getGenerator(ext, merge).generate(raw, name, dtsMeta)
         }

         if (!merge && result) {
            this.cacheHandler([file], dtsMeta!.genFile, raw, result)
         }
      }

      files.forEach(file => {
         if (this.options.verifyChange === "date") {
            let stats = statSync(file)
            // verify if file has changed
            if (this.session.get(file) !== undefined &&
               this.session.get(file)!.modified === stats.mtime.getTime()) {
               return
            } else {
               generateDts(file)
               this.session.set(file, {
                  modified: stats.mtime.getTime(),
                  resModule: this.getGenerator(ext, merge).getResourceModule()
               })
            }
         } else {
            generateDts(file)
         }
      })

      // save all parse to the file
      if (merge) {
         let dtsMeta = this.createDtsMeta(dir, basename(dir), true)
         let result = this.getGenerator(ext, merge).commit(dtsMeta)
         this.cacheHandler(files, dtsMeta.genFile, result.rawMerge, result.module)
      }
   }

   /** apply webpack plugin to generate dts file */
   private applyWebpackPlugin(compiler: webpack.Compiler) {

      // cache webpack alias configuration
      if (compiler.options.resolve) {
         this.webpackAlias = compiler.options.resolve.alias
         if (this.webpackAlias) {
            this.reverseAlias = {}
            // reverse key value as 
            // webpack rules see https://webpack.js.org/configuration/resolve/#resolvealias
            let keySet = Object.keys(this.webpackAlias)
            keySet.forEach(key => {
               let part = this.webpackAlias![key]
               this.reverseAlias![part] = key
            })
         }
      }

      // generate dts file before webpack compiled
      compiler.hooks.beforeCompile.tap("WebpackResourcePlugin", (_: {}) => {
         this.resFiles = PluginFactory.getResourcesFiles(this.options.glob, this.options.merge)
         Object.keys(this.resFiles).forEach(dir => {
            let exts = Object.keys(this.resFiles[dir].extension)
            if (this.resFiles[dir].merge) {
               let files: string[] = []
               exts.forEach(ext => {
                  files.push(...this.resFiles[dir].extension[ext].files)
               })
               // Note: a merge folder should contain only an identical type of resources
               // such as stylesheet or vector svg. A mixed with svg and css file will
               // produce an unexpected result.
               this.generateTypes(dir, files, this.resFiles[dir].merge, exts[0])
            } else {
               exts.forEach(ext => {
                  let extRes = this.resFiles[dir].extension[ext]
                  this.generateTypes(dir, extRes.files, this.resFiles[dir].merge, ext)
               })
            }
         })

      })
   }

   /** */
   private removeRelativeDot(inp: string): string {
      return inp.startsWith("./") ? inp.substring(2) : inp
   }

   /** */
   private applyWebpackResolverPlugin(resolver: ExtResolver) {
      resolver.hooks.describedResolve.tapAsync("ResourcesResolver", (req: ResolverRequest, _: LoggingCallbackTools, callback: LoggingCallbackWrapper) => {
         let relFile = ""
         if (this.webpackAlias && !req.request.startsWith("./")) {
            Object.keys(this.webpackAlias).forEach(key => {
               let alias = this.webpackAlias![key]
               if (alias.endsWith("$") && alias.substring(0, alias.length - 1) === req.request) {
                  let absfile = `${req.descriptionFileRoot}/change-me`
                  relFile = relative(req.descriptionFileRoot!, absfile)
               } else if (req.request.startsWith(alias)) {
                  // found alias
                  relFile = req.request.replace(key, alias)
               }
            })
         } else {
            relFile = `${this.removeRelativeDot(req.relativePath!)}/${this.removeRelativeDot(req.request)}`
         }
         if (relFile !== "") {
            let fStat = statSync(relFile)
            if (fStat.isDirectory()) {
               // merge needed
               let abspath = resolve(relFile)
               if (this.resFiles[abspath].merge) {
                  return this.createAliasResolveReplacement(resolver, req, `${relFile}/${basename(relFile)}.d.json`, callback)
               }
            } else {
               let fd = dirname(resolve(relFile))
               let ext = extname(relFile)
               if (this.resFiles[fd] !== undefined && this.resFiles[fd].extension[ext] !== undefined) {
                  return this.createAliasResolveReplacement(resolver, req, `${relFile}.json`, callback)
               }
            }
         }
         return callback();
      })
   }

   /** */
   private createAliasResolveReplacement(resolver: ExtResolver, req: ResolverRequest, relPath: string, callback: LoggingCallbackWrapper) {
      let cacheDir = this.options.tmp ? resolve(this.options.tmp) : `${tmpdir()}/${this.pkg}/resources-utilities/cache`
      const obj = Object.assign({}, req, {
         request: `${cacheDir}/${relPath}`
      });
      return resolver.doResolve(resolver.hooks.resolve, obj,
         "aliased with mapping", (err?: Error | null, result?: ResolverRequest): any => {
            if (err) return callback(err);

            // Don't allow other aliasing or raw request
            if (result === undefined) return callback(null, null);
            callback(null, result);
         });
   }

}