import { DtsGeneratorOptions, ResourceFiles, PluginFactory } from "@resmod/webpack/plugins/factory";
import { CssDTSGenerator } from "@resmod/cli/css";
import { SvgDTSGenerator } from "@resmod/cli/svg";
import { DTSGenerator, DTSMeta, GeneratedResult } from "@resmod/cli/generator";
import { ResourceModule } from "@resmod/webpack/loader/types";
import { ExtResolver } from "@resmod/types/webpack";
import { transformFileNameConvention } from "@resmod/common/convension";
import { mkdirSyncRecursive } from "@resmod/common/file";

import { statSync, readFileSync, existsSync, writeFileSync, realpathSync, mkdirSync, rmdirSync, readdirSync, lstatSync, unlinkSync } from "fs";
import webpack from "webpack";
import SVGO from "svgo";
import { renderSync } from "node-sass";

import { ResolverRequest, LoggingCallbackTools, LoggingCallbackWrapper } from "enhanced-resolve/lib/common-types";
import { basename, resolve, dirname, extname, relative } from "path";
import { tmpdir } from "os";
import { GlobSync } from "glob";
import { CommandLineOptions } from "@resmod/cli/dts";

/**
 * 
 */
interface SessionCache {
   modified?: number
   result?: GeneratedResult
   files?: string[]
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

   protected output?: webpack.Output
   protected svgo?: SVGO

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

   /** */
   private getTemporaryCacheDirectory(): string {
      return this.options.tmp ? resolve(this.options.tmp) : `${realpathSync(tmpdir())}/${this.pkg}/resources-utilities/cache`
   }

   /** */
   private async optimizeSvg(content: string): Promise<string> {
      if (!this.svgo) {
         this.svgo = new SVGO(this.options.merge ? {
            plugins: [
               { removeUselessDefs: false },
               { removeUnknownsAndDefaults: false },
               { cleanupIDs: false }
            ]
         } : undefined)
      }
      return (await this.svgo!.optimize(content).catch(e => {
         console.log("--???--", content)
         throw `Plugin svg optimization error: ${e}`
      })).data;
   }

   /** */
   private async getInjectFileType(content: string, cacheObj: GeneratedMetadata): Promise<string> {
      if (process.env.NODE_ENV !== 'production' && !this.options.excludeInject) {
         if (this.options.glob.endsWith(".svg")) {
            let optContent = await this.optimizeSvg(content);
            return `
            let div = document.createElement('div');
            div.innerHTML = \`${optContent}\`;
            let svg = div.children[0];
            document.body.appendChild(svg);
            var att = document.createAttribute("display");
            att.value = "none";
            svg.setAttributeNode(att);           
         `
         } else {
            // expect css, scss, sass here
            return `
            let style = document.createElement('style');
            style.type = 'text/css';
            document.head.appendChild(style);
            style.appendChild(document.createTextNode(\`${content}\`));
         `
         }
      } else {
         // we're in production
         let bundleDir = this.output!.path
         let name: string
         if (this.options.merge) {
            name = relative(process.cwd(), dirname(cacheObj.files[0]))
         } else {
            name = relative(process.cwd(), cacheObj.files[0])
            name = name.substring(0, name.lastIndexOf("."))
         }

         let saveFile = (file: string, content: string) => {
            mkdirSync(dirname(file), { recursive: true })
            writeFileSync(file, content)
         }
         if (this.options.glob.endsWith(".svg")) {
            let optContent = this.optimizeSvg(content);
            saveFile(`${bundleDir}/${name}.svg`, await optContent)
         } else {
            let result = renderSync({ data: content, outputStyle: "compressed" })
            saveFile(`${bundleDir}/${name}.css`, result.css.toString())
         }
         return ""
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
   private async cacheHandler(files: string[], dtsFile: string, dir: string, raw?: string, resmod?: ResourceModule) {
      let tmp = this.getTemporaryCacheDirectory()
      let relativeDir = relative(process.cwd(), dir)
      let filedir = `${tmp}/${relativeDir}`
      let name = basename(dtsFile)
      name = `${name.substring(0, name.indexOf(".", name.indexOf(".") + 1))}.js`

      let cacheObj = {
         files: files,
         resModule: resmod,
         rawContent: raw
      } as GeneratedMetadata

      if (!existsSync(filedir)) mkdirSyncRecursive(filedir)
      let cacheFile = `${filedir}/${name}`
      console.debug(`writing cache data at ${cacheFile}`)
      let clone = Object.assign({}, cacheObj)
      clone.resModule = undefined
      if (process.env.NODE_ENV !== 'production') {
         if (cacheObj.resModule) {
            cacheObj.resModule.__description = clone
         } else {
            cacheObj.resModule = { __description: clone }
         }
      }
      writeFileSync(cacheFile, `
         ${await this.getInjectFileType(cacheObj.rawContent, cacheObj)}
         module.exports = ${JSON.stringify(cacheObj.resModule)}
      `)
   }

   /** */
   private getGenerator(ext: string, merge: boolean): DTSGenerator {
      // any extension .css, .scss or .sass work fine with CssDTSGenerator
      ext = ext === ".svg" ? ext : ".css"
      let generator = this.generator.get(ext)
      if (generator === undefined) {
         let opts = {
            merge: merge,
            wrap: this.options.mergeFilenameAsId,
            glob: [],
            convension: this.options.convension!,
            alias: this.reverseAlias
         } as CommandLineOptions
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

      let generateDts = (file: string, cacheResult?: GeneratedResult | undefined): GeneratedResult => {
         let name = basename(file)
         name = transformFileNameConvention(name.substring(0, name.lastIndexOf(".")), this.options.convension!)
         let dtsMeta = dtsMetaFile(file)

         let ext = extname(file)
         if (!cacheResult) {
            if (ext === ".scss" || ext === ".sass") {
               cacheResult = this.getGenerator(ext, merge)
                  .generate(renderSync({ file: file }).css.toString(), name, false, dtsMeta)
            } else {
               cacheResult = this.getGenerator(ext, merge)
                  .generate(readFileSync(file).toString(), name, this.options.mergeFilenameAsId, dtsMeta)
            }
         } else {
            this.getGenerator(ext, merge).populateCache(cacheResult!)
         }

         if (!merge && cacheResult) {
            this.cacheHandler([file], dtsMeta!.genFile, dir, cacheResult!.raw, cacheResult!.resModule)
         }
         return cacheResult!
      }

      let hasChanged = false
      if (this.options.verifyChange === "date") {
         if (this.session.get(dir) === undefined) {
            this.session.set(dir, { files: files });
         } else if (this.session.get(dir)!.files!.length !== files.length) {
            // a file has been remove
            this.session.get(dir)!.files!.forEach(file => {
               if (files.indexOf(file) < 0) {
                  // file is removed
                  this.session.delete(file);
                  hasChanged = true
               }
            });
            this.session.get(dir)!.files = files;
         }
         for (let file of files) {
            // verify if file has changed
            let stats = statSync(file)
            if (this.session.get(file) === undefined ||
               this.session.get(file)!.modified !== stats.mtime.getTime()) {
               hasChanged = true;
               // invalidate cache
               this.session.delete(file);
               break
            }
         }
         if (!hasChanged) return;
      }


      files.forEach(file => {
         if (this.options.verifyChange === "date") {
            if (this.session.get(file) !== undefined) {
               // only merge need to update the combine generated code
               if (!merge) throw "only merge suppose to be here"
               generateDts(file, this.session.get(file)!.result)
               return
            } else {
               this.session.set(file, {
                  modified: statSync(file).mtime.getTime(),
                  result: generateDts(file)
               })
               hasChanged = true
            }
         } else {
            hasChanged = true
            generateDts(file)
         }
      })

      // save all parse to the file
      if (merge && hasChanged) {
         let dtsMeta = this.createDtsMeta(dir, basename(dir), true)
         let result = this.getGenerator(ext, merge).commit(dtsMeta)
         this.cacheHandler(files, dtsMeta.genFile, dir, result.raw, result.resModule)
      }
   }

   /** apply webpack plugin to generate dts file */
   private applyWebpackPlugin(compiler: webpack.Compiler) {
      this.output = compiler.options.output

      var deleteFolderRecursive = function (path: string, removeSelf: boolean) {
         if (existsSync(path)) {
            readdirSync(path).forEach(function (file) {
               var curPath = path + "/" + file;
               if (lstatSync(curPath).isDirectory()) { // recurse
                  deleteFolderRecursive(curPath, true);
               } else { // delete file
                  unlinkSync(curPath);
               }
            });
            if (removeSelf) rmdirSync(path);
         }
      };
      // When running test, we need to keep the generated file for verification
      if (process.env.NODE_ENV !== 'test') {
         if (process.env.WEBPACK_DEV_SERVER) {
            compiler.hooks.watchClose.tap("WebpackResourcePlugin", (_: {}) => {
               deleteFolderRecursive(this.getTemporaryCacheDirectory(), false)
            })
         } else {
            compiler.hooks.done.tap("WebpackResourcePlugin", (_: {}) => {
               deleteFolderRecursive(this.getTemporaryCacheDirectory(), false)
            })
         }
      }

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

      // add watch change dependencies
      compiler.hooks.afterCompile.tap("WebpackResourcePlugin", (compilation) => {
         let gl = new GlobSync(this.options.glob)
         if (this.options.merge) {
            this.options.merge!.forEach(dir => {
               compilation.contextDependencies.add(dir)
            })
         } else {
            gl.found.forEach(file => {
               compilation.fileDependencies.add(file)
            })
         }
      })

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
         let validFile = req.request.endsWith(".svg") ||
            req.request.endsWith(".css") ||
            req.request.endsWith(".sass") ||
            req.request.endsWith(".scss")

         if (this.options.merge) {
            for (let p of this.options.merge) {
               let refRequest: string
               if (this.webpackAlias && this.webpackAlias[req.request]) {
                  // got module alias
                  refRequest = this.webpackAlias[req.request]
               } else {
                  refRequest = req.relativePath ? `${req.relativePath}/${req.request}` : req.request
               }

               if (resolve(p) === resolve(refRequest)) {
                  validFile = true
                  break
               }
            }
         }

         if (validFile) {
            let relFile = ""
            let abspath = ""
            if (this.webpackAlias && !req.request.startsWith("./")) {
               for (let alias of Object.keys(this.webpackAlias)) {
                  if (alias.endsWith("$") && alias.substring(0, alias.length - 1) === req.request) {
                     let absfile = `${req.descriptionFileRoot}/change-me`
                     relFile = relative(req.descriptionFileRoot!, absfile)
                     break
                  } else if (req.request.startsWith(alias)) {
                     // found alias
                     abspath = this.webpackAlias![alias]
                     if (req.request != alias && req.request.startsWith(alias)) {
                        let suffix = req.request.substring(alias.length)
                        abspath = `${abspath}${suffix}`
                     }
                     let refDir = process.cwd()
                     relFile = relative(refDir, abspath)
                     break
                  }
               }
            } else if (req.relativePath) {
               relFile = `${this.removeRelativeDot(req.relativePath!)}/${this.removeRelativeDot(req.request)}`
               abspath = resolve(relFile)
            }
            if (relFile !== "") {
               let fStat = statSync(abspath)
               if (fStat.isDirectory()) {
                  // merge needed
                  if (this.resFiles[abspath] && this.resFiles[abspath].merge) {
                     return this.createAliasResolveReplacement(resolver, req, `${relFile}/${basename(relFile)}.d.js`, callback)
                  }
               } else {
                  let fd = dirname(abspath)
                  let ext = extname(relFile)
                  if (this.resFiles[fd] !== undefined && this.resFiles[fd].extension[ext] !== undefined) {
                     return this.createAliasResolveReplacement(resolver, req, `${relFile}.js`, callback)
                  }
               }
            }
         }
         return callback();
      })
   }

   /** */
   private createAliasResolveReplacement(resolver: ExtResolver, req: ResolverRequest, relPath: string, callback: LoggingCallbackWrapper) {
      let cacheDir = this.getTemporaryCacheDirectory()
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