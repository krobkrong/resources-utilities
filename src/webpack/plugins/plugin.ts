import { CssDTSGenerator } from "@resmod/cli/css";
import { DTSGenerator, IDTSMeta, IGeneratedResult } from "@resmod/cli/generator";
import { SvgDTSGenerator } from "@resmod/cli/svg";
import { transformFileNameConvention } from "@resmod/common/convension";
import { mkdirSyncRecursive } from "@resmod/common/file";
import { ExtResolver } from "@resmod/types/webpack";
import { IResourceModule } from "@resmod/webpack/loader/types";
import { IDtsGeneratorOptions, IResourceFiles, PluginFactory } from "@resmod/webpack/plugins/factory";

import {
   existsSync,
   lstatSync,
   mkdirSync,
   readdirSync,
   readFileSync,
   realpathSync,
   rmdirSync,
   statSync,
   unlinkSync,
   writeFileSync,
} from "fs";

import { renderSync } from "node-sass";
import SVGO from "svgo";
import webpack from "webpack";

import { ICommandLineOptions } from "@resmod/cli/dts";
import { LoggingCallbackTools, LoggingCallbackWrapper, ResolverRequest } from "enhanced-resolve/lib/common-types";
import { GlobSync } from "glob";
import { tmpdir } from "os";
import { basename, dirname, extname, relative, resolve } from "path";

/**
 *
 */
interface ISessionCache {
   modified?: number;
   result?: IGeneratedResult;
   files?: string[];
}

/**
 *
 */
export interface IGeneratedMetadata {
   resModule?: IResourceModule;
   rawContent: string;
   files: string[];
}

/**
 *
 */
export class WebpackResourcePlugin {

   protected options: IDtsGeneratorOptions;
   protected resFiles!: IResourceFiles;
   protected webpackAlias?: { [key: string]: string };
   protected reverseAlias?: { [key: string]: string };

   protected session: Map<string, ISessionCache>;
   protected generator: Map<string, DTSGenerator>;
   protected root: string;
   protected pkg: string;

   protected output?: webpack.Output;
   protected svgo?: SVGO;

   constructor(options: IDtsGeneratorOptions) {
      this.options = options;
      this.session = new Map();
      this.generator = new Map();
      this.root = process.cwd();
      this.pkg = require(`${process.cwd()}/package.json`).name as string;
   }

   /**
    * Implement webpack plugin method
    * @param pluginContext argument that provide by webpack
    */
   public apply(pluginContext: webpack.Compiler | ExtResolver): void {

      if (pluginContext.constructor.name === "Resolver") {
         this.applyWebpackResolverPlugin(pluginContext as ExtResolver);
      } else {
         this.applyWebpackPlugin(pluginContext as webpack.Compiler);
      }

   }

   /** */
   public async optimizeSvg(content: string): Promise<string> {
      if (!this.svgo) {
         const removeAttr = {
            removeAttrs: {
               // All of this properties should be relied on stylesheet instead.
               attrs: [
                  "color",
                  // remove all fill properties
                  "fill", "fill-opacity", "fill-rule",
                  // remove all stroke properties
                  "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset",
                  "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity",
                  // remove font properties
                  "font", "font-family", "font-size", "font-size-adjust", "font-stretch",
                  "font-style", "font-variant", "font-weight",
               ],
            },
         };
         let svgoOpt: SVGO.Options | undefined;
         if (this.options.merge) {
            svgoOpt = {
               plugins: [
                  { removeUselessDefs: false },
                  { removeUnknownsAndDefaults: false },
                  { cleanupIDs: false },
                  removeAttr,
               ],
            };
         }
         if (this.options.cleanSvgPresentationAttr) {
            svgoOpt = Object.assign({ plugins: [] }, svgoOpt);
            svgoOpt.plugins!.push(removeAttr);
         }
         this.svgo = new SVGO(svgoOpt);
      }
      return (await this.svgo!.optimize(content).catch((e) => {
         throw new Error(`Plugin svg optimization error: ${e}`);
      })).data;
   }

   /** */
   private getTemporaryCacheDirectory(): string {
      return this.options.tmp ? resolve(this.options.tmp) : `${realpathSync(tmpdir())}/${this.pkg}/resources-utilities/cache`;
   }

   /** */
   private async getInjectFileType(content: string, cacheObj: IGeneratedMetadata): Promise<string> {
      if (process.env.NODE_ENV !== "production" && !this.options.excludeInject) {
         if (this.options.glob.endsWith(".svg")) {
            const optContent = await this.optimizeSvg(content);
            return `
            let div = document.createElement('div');
            div.innerHTML = \`${optContent}\`;
            let svg = div.children[0];
            document.body.appendChild(svg);
            var att = document.createAttribute("display");
            att.value = "none";
            svg.setAttributeNode(att);
         `;
         } else {
            // expect css, scss, sass here
            return `
            let style = document.createElement('style');
            style.type = 'text/css';
            document.head.appendChild(style);
            style.appendChild(document.createTextNode(\`${content}\`));
         `;
         }
      } else {
         // we're in production
         const bundleDir = this.output!.path;
         let name: string;
         if (this.options.merge) {
            name = relative(process.cwd(), dirname(cacheObj.files[0]));
         } else {
            name = relative(process.cwd(), cacheObj.files[0]);
            name = name.substring(0, name.lastIndexOf("."));
         }

         const saveFile = (file: string, saveContent: string) => {
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, saveContent);
         };
         if (this.options.glob.endsWith(".svg")) {
            const optContent = this.optimizeSvg(content);
            saveFile(`${bundleDir}/${name}.svg`, await optContent);
         } else {
            const result = renderSync({ data: content, outputStyle: "compressed" });
            saveFile(`${bundleDir}/${name}.css`, result.css.toString());
         }
         return "";
      }
   }

   /**  */
   private getAliasMatch(importStmt: string): string {
      if (this.webpackAlias !== undefined) {
         if (this.reverseAlias![importStmt]) {
            // match exactly, regardless of $ sign it's eligable
            const transformImport = this.reverseAlias![importStmt];
            if (transformImport.endsWith("$")) { return transformImport.substr(0, transformImport.length - 1); }
            return transformImport;
         }
         // let find parent folder that match the file
         let dir;
         do {
            dir = dirname(importStmt);
            if (this.reverseAlias![dir] && !this.reverseAlias![dir].endsWith("$")) {
               return this.reverseAlias![dir];
            }
         } while (dir === ".");
      }
      // not found any not transform
      return importStmt;
   }

   private createDtsMeta(dir: string, name: string, merge: boolean): IDTSMeta {
      const dm = { extension: extname(name) } as IDTSMeta;
      dm.module = merge ? dir.replace(`${this.root}/`, "") : `${dir.replace(`${this.root}/`, "")}/${name}`;
      if (this.options.output) {
         dm.genFile = `${resolve(this.options.output!)}/${name}.d.ts`;
      } else {
         dm.genFile = `${dir}/${name}.d.ts`;
      }
      if (this.webpackAlias) {
         dm.module = this.getAliasMatch(dm.module);
      }
      return dm;
   }

   /** */
   private async cacheHandler(files: string[], dtsFile: string, dir: string, raw?: string, resmod?: IResourceModule) {
      const tmp = this.getTemporaryCacheDirectory();
      const relativeDir = relative(process.cwd(), dir);
      const filedir = `${tmp}/${relativeDir}`;
      let name = basename(dtsFile);
      name = `${name.substring(0, name.indexOf(".", name.indexOf(".") + 1))}.js`;

      const cacheObj = {
         files,
         rawContent: raw,
         resModule: resmod,
      } as IGeneratedMetadata;

      if (!existsSync(filedir)) { mkdirSyncRecursive(filedir); }
      const cacheFile = `${filedir}/${name}`;
      const clone = Object.assign({}, cacheObj);
      clone.resModule = undefined;
      if (process.env.NODE_ENV !== "production") {
         if (cacheObj.resModule) {
            cacheObj.resModule.__description = clone;
         } else {
            cacheObj.resModule = { __description: clone };
         }
      }
      writeFileSync(cacheFile, `
         ${await this.getInjectFileType(cacheObj.rawContent, cacheObj)}
         module.exports = ${JSON.stringify(cacheObj.resModule)}
      `);
   }

   /** */
   private getGenerator(ext: string, merge: boolean): DTSGenerator {
      // any extension .css, .scss or .sass work fine with CssDTSGenerator
      ext = ext === ".svg" ? ext : ".css";
      let generator = this.generator.get(ext);
      if (generator === undefined) {
         const opts = {
            alias: this.reverseAlias,
            convension: this.options.convension!,
            glob: [],
            merge,
            wrap: this.options.mergeFilenameAsId,
         } as ICommandLineOptions;
         generator = ext === ".svg" ? new SvgDTSGenerator(opts) :
            new CssDTSGenerator(opts, { excludeSelectorSymbol: this.options.excludeSelectorSymbol });
         this.generator.set(ext, generator);
      }
      return generator;
   }

   /** */
   private generateTypes(dir: string, files: string[], merge: boolean, ext: string) {

      let dtsMetaFile: (file: string) => IDTSMeta | undefined;
      if (merge) {
         this.getGenerator(ext, merge).begin();
         // mock function when merge option is set
         dtsMetaFile = (_: string): IDTSMeta | undefined => undefined;
      } else {
         dtsMetaFile = (file: string): IDTSMeta => {
            return this.createDtsMeta(dir, basename(file), false);
         };
      }

      const generateDts = (file: string, cacheResult?: IGeneratedResult | undefined): IGeneratedResult => {
         let name = basename(file);
         name = transformFileNameConvention(name.substring(0, name.lastIndexOf(".")), this.options.convension!);
         const dtsMeta = dtsMetaFile(file);

         const fext = extname(file);
         if (!cacheResult) {
            if (fext === ".scss" || fext === ".sass") {
               cacheResult = this.getGenerator(fext, merge)
                  .generate(renderSync({ file }).css.toString(), name, false, dtsMeta);
            } else {
               cacheResult = this.getGenerator(fext, merge)
                  .generate(readFileSync(file).toString(), name, this.options.mergeFilenameAsId, dtsMeta);
            }
         } else {
            this.getGenerator(fext, merge).populateCache(cacheResult!);
         }

         if (!merge && cacheResult) {
            this.cacheHandler([file], dtsMeta!.genFile, dir, cacheResult!.raw, cacheResult!.resModule);
         }
         return cacheResult!;
      };

      let hasChanged = false;
      const dirExt = `${dir}:${extname(files[0])}`;
      if (this.options.verifyChange === "date") {
         if (this.session.get(dirExt) === undefined) {
            this.session.set(dirExt, { files });
         } else if (this.session.get(dirExt)!.files!.length !== files.length) {
            // a file has been remove
            this.session.get(dirExt)!.files!.forEach((file) => {
               if (files.indexOf(file) < 0) {
                  // file is removed
                  this.session.delete(file);
                  hasChanged = true;
               }
            });
            this.session.get(dirExt)!.files = files;
         }
         for (const file of files) {
            // verify if file has changed
            const stats = statSync(file);
            if (this.session.get(file) === undefined ||
               this.session.get(file)!.modified !== stats.mtime.getTime()) {
               hasChanged = true;
               // invalidate cache
               this.session.delete(file);
               break;
            }
         }
         if (!hasChanged) { return; }
      }

      files.forEach((file) => {
         if (this.options.verifyChange === "date") {
            if (this.session.get(file) !== undefined) {
               // only merge need to update the combine generated code
               if (!merge) {
                  const stats = statSync(file);
                  if (this.session.get(file)!.modified === stats.mtime.getTime()) { return; }
               }
               generateDts(file, this.session.get(file)!.result);
            } else {
               this.session.set(file, {
                  modified: statSync(file).mtime.getTime(),
                  result: generateDts(file),
               });
               hasChanged = true;
            }
         } else {
            hasChanged = true;
            generateDts(file);
         }
      });

      // save all parse to the file
      if (merge && hasChanged) {
         const dtsMeta = this.createDtsMeta(dir, basename(dir), true);
         const result = this.getGenerator(ext, merge).commit(dtsMeta);
         this.cacheHandler(files, dtsMeta.genFile, dir, result.raw, result.resModule);
      }
   }

   /** apply webpack plugin to generate dts file */
   private applyWebpackPlugin(compiler: webpack.Compiler) {
      this.output = compiler.options.output;

      const deleteFolderRecursive = (path: string, removeSelf: boolean) => {
         if (existsSync(path)) {
            readdirSync(path).forEach((file) => {
               const curPath = path + "/" + file;
               if (lstatSync(curPath).isDirectory()) { // recurse
                  deleteFolderRecursive(curPath, true);
               } else { // delete file
                  unlinkSync(curPath);
               }
            });
            if (removeSelf) { rmdirSync(path); }
         }
      };
      // When running test, we need to keep the generated file for verification
      if (process.env.NODE_ENV !== "test") {
         if (process.env.WEBPACK_DEV_SERVER) {
            compiler.hooks.watchClose.tap("WebpackResourcePlugin", (_: {}) => {
               deleteFolderRecursive(this.getTemporaryCacheDirectory(), false);
            });
         } else {
            compiler.hooks.done.tap("WebpackResourcePlugin", (_: {}) => {
               deleteFolderRecursive(this.getTemporaryCacheDirectory(), false);
            });
         }
      }

      // cache webpack alias configuration
      if (compiler.options.resolve) {
         this.webpackAlias = compiler.options.resolve.alias;
         if (this.webpackAlias) {
            this.reverseAlias = {};
            // reverse key value as
            // webpack rules see https://webpack.js.org/configuration/resolve/#resolvealias
            const keySet = Object.keys(this.webpackAlias);
            keySet.forEach((key) => {
               const part = this.webpackAlias![key];
               this.reverseAlias![part] = key;
            });
         }
      }

      // add watch change dependencies
      compiler.hooks.afterCompile.tap("WebpackResourcePlugin", (compilation) => {
         const gl = new GlobSync(this.options.glob);
         if (this.options.merge) {
            this.options.merge!.forEach((dir) => {
               compilation.contextDependencies.add(dir);
            });
         } else {
            gl.found.forEach((file) => {
               compilation.fileDependencies.add(file);
            });
         }
      });

      // generate dts file before webpack compiled
      compiler.hooks.beforeCompile.tap("WebpackResourcePlugin", (_: {}) => {
         this.resFiles = PluginFactory.getResourcesFiles(this.options.glob, this.options.merge);

         Object.keys(this.resFiles).forEach((dir) => {
            const exts = Object.keys(this.resFiles[dir].extension);
            if (this.resFiles[dir].merge) {
               const files: string[] = [];
               exts.forEach((ext) => {
                  files.push(...this.resFiles[dir].extension[ext].files);
               });
               // Note: a merge folder should contain only an identical type of resources
               // such as stylesheet or vector svg. A mixed with svg and css file will
               // produce an unexpected result.
               this.generateTypes(dir, files, this.resFiles[dir].merge, exts[0]);
            } else {
               exts.forEach((ext) => {
                  const extRes = this.resFiles[dir].extension[ext];
                  this.generateTypes(dir, extRes.files, this.resFiles[dir].merge, ext);
               });
            }
         });

      });
   }

   /** */
   private removeRelativeDot(inp: string): string {
      return inp.startsWith("./") ? inp.substring(2) : inp;
   }

   /** */
   private applyWebpackResolverPlugin(resolver: ExtResolver) {
      resolver.hooks.describedResolve.tapAsync("ResourcesResolver",
         (req: ResolverRequest, _: LoggingCallbackTools, callback: LoggingCallbackWrapper) => {
            let validFile = req.request.endsWith(".svg") ||
               req.request.endsWith(".css") ||
               req.request.endsWith(".sass") ||
               req.request.endsWith(".scss");

            if (this.options.merge) {
               for (const p of this.options.merge) {
                  let refRequest: string;
                  if (this.webpackAlias && this.webpackAlias[req.request]) {
                     // got module alias
                     refRequest = this.webpackAlias[req.request];
                  } else {
                     refRequest = req.relativePath ? `${req.relativePath}/${req.request}` : req.request;
                  }

                  if (resolve(p) === resolve(refRequest)) {
                     validFile = true;
                     break;
                  }
               }
            }

            if (validFile) {
               let relFile = "";
               let abspath = "";
               if (this.webpackAlias && !req.request.startsWith("./")) {
                  for (const alias of Object.keys(this.webpackAlias)) {
                     if (alias.endsWith("$") && alias.substring(0, alias.length - 1) === req.request) {
                        const absfile = `${req.descriptionFileRoot}/change-me`;
                        relFile = relative(req.descriptionFileRoot!, absfile);
                        break;
                     } else if (req.request.startsWith(alias)) {
                        // found alias
                        abspath = this.webpackAlias![alias];
                        if (req.request !== alias && req.request.startsWith(alias)) {
                           const suffix = req.request.substring(alias.length);
                           abspath = `${abspath}${suffix}`;
                        }
                        const refDir = process.cwd();
                        relFile = relative(refDir, abspath);
                        break;
                     }
                  }
               } else if (req.relativePath) {
                  relFile = `${this.removeRelativeDot(req.relativePath!)}/${this.removeRelativeDot(req.request)}`;
                  abspath = resolve(relFile);
               }
               if (relFile !== "") {
                  const fStat = statSync(abspath);
                  if (fStat.isDirectory()) {
                     // merge needed
                     if (this.resFiles[abspath] && this.resFiles[abspath].merge) {
                        return this.createAliasResolveReplacement(resolver, req,
                           `${relFile}/${basename(relFile)}.d.js`, callback);
                     }
                  } else {
                     const fd = dirname(abspath);
                     const ext = extname(relFile);
                     if (this.resFiles[fd] !== undefined && this.resFiles[fd].extension[ext] !== undefined) {
                        return this.createAliasResolveReplacement(resolver, req, `${relFile}.js`, callback);
                     }
                  }
               }
            }
            return callback();
         });
   }

   /** */
   private createAliasResolveReplacement(
      resolver: ExtResolver,
      req: ResolverRequest,
      relPath: string,
      callback: LoggingCallbackWrapper) {
      const cacheDir = this.getTemporaryCacheDirectory();
      const obj = Object.assign({}, req, {
         request: `${cacheDir}/${relPath}`,
      });
      return resolver.doResolve(resolver.hooks.resolve, obj,
         "aliased with mapping", (err?: Error | null, result?: ResolverRequest): any => {
            if (err) { return callback(err); }

            // Don't allow other aliasing or raw request
            if (result === undefined) { return callback(null, null); }
            callback(null, result);
         });
   }

}
