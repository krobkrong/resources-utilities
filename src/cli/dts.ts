import { CssDTSGenerator } from "@resmod/cli/css";
import { FileDtsGenerator } from "@resmod/cli/file";
import { DTSGenerator, IDTSMeta, IGeneratedResult } from "@resmod/cli/generator";
import { SvgDTSGenerator } from "@resmod/cli/svg";
import { NameConvension, transformFileNameConvention } from "@resmod/common/convension";
import { ICssParseOptions } from "@resmod/style/parser";
import { IVectorParseOptions } from "@resmod/vector/parser";
import { IResourceModule } from "@resmod/webpack/loader/types";
import { readFileSync } from "fs";
import { renderSync } from "node-sass";
import { basename, dirname, extname, isAbsolute } from "path";

/**
 * Command options for resource module command line.
 */
export interface ICommandLineOptions {
   /**
    * If wrap is true then dts value will generated based on file name rather than
    * the element id from the svg file. This option must use together with merge option.
    * The useful case that suitable to use wrap is when you have multiple svg files where
    * each file is represent an icon.
    */
   wrap?: boolean;

   /**
    * true if every resource or file in the folder should merge
    * into a single modules otherwise the resource module will generate
    * the definition file for each resource file.
    */
   merge: boolean | undefined;

   /**
    * Setting this value if you using alias or custom resolve in webpack.
    * This allow the generated code produce the correct import module which
    * is necessary to verify by typescript compiler.
    */
   alias?: { [index: string]: string };

   /**
    * The output directory of the definition file. If not specified then
    * the definition file will generate and store at the same location as resource file.
    */
   output?: string;

   /**
    * The input data, can be a regular path or a glob syntax.
    */
   glob: string[];

   /**
    * a convension to generate variable name. Support 4 different case:
    * camel case, pascal case, snake case and Snake case.
    * **Note:** Snake case is an uppercase version of snake case
    */
   convension: NameConvension;

   /**
    * location where to save file that parsed with merge options.
    */
   save?: string;
}

/**
 * Provide a callback when the commit to generate teh file is happened.
 */
export type CommitCallback = (files: string[], dtsFile: string, raw?: string, resmod?: IResourceModule) => void;

/**
 * Generate dts file from the given resources.
 * @param options command line optinos
 */
export function Generate(
   options: ICommandLineOptions,
   svgOpts?: IVectorParseOptions,
   cssOpts?: ICssParseOptions,
   commitedCallback?: CommitCallback) {

   if (options.wrap) {
      if (!options.merge) {
         throw new Error("wrap only use with merge option set to true.");
      }
      generateWrapped(options);
      return;
   }

   let cssGen: DTSGenerator | undefined;
   let svgGen: DTSGenerator | undefined;

   const mdir = new Map<string, string[]>();
   const root = `${process.cwd()}/`;

   // group file by folder, it is simplified the merge process
   options.glob.forEach((file) => {
      if (file.endsWith(".mod.svg") || file.endsWith(".mod.css")) {
         return;
      }
      // group by extension
      const ext = extname(file);
      const key = `${dirname(file)}${ext}`;
      if (mdir.get(key)) {
         mdir.get(key)!.push(file);
      } else {
         mdir.set(key, [file]);
      }
      if (svgGen === undefined && ext === ".svg") {
         svgGen = new SvgDTSGenerator(options, svgOpts);
      } else if (cssGen === undefined && (ext === ".css" || ext === ".scss" || ext === ".sass")) {
         cssGen = new CssDTSGenerator(options, cssOpts);
      }
   });

   // generate dts
   const genDts = (file: string, name: string, ext: string, _?: IDTSMeta): IGeneratedResult => {
      name = transformFileNameConvention(name, options.convension);
      let raw;
      switch (ext) {
         case ".svg":
            raw = readFileSync(file).toString();
            return svgGen!.generate(raw, name, options.wrap, dtsMeta)!;

         case ".scss":
         case ".sass":
            raw = renderSync({ file }).css.toString();
            return cssGen!.generate(raw, name, false, dtsMeta)!;

         case ".css":
            raw = readFileSync(file).toString();
            return cssGen!.generate(raw, name, false, dtsMeta)!;

         default:
            throw new Error("unsupported resources");
      }
   };

   const dtsMeta = {} as IDTSMeta;

   // loop through each folder to generate dts
   for (const [key, val] of mdir) {

      if (options.merge) {

         const ldot = key.lastIndexOf(".");
         dtsMeta.module = key.substring(0, ldot);
         if (isAbsolute(dtsMeta.module)) {
            dtsMeta.module = dtsMeta.module.replace(root, "");
         }

         if (!options.output) {
            dtsMeta.genFile = `${dtsMeta.module}/${basename(key)}.d.ts`;
         } else {
            dtsMeta.genFile = `${options.output}/${basename(key)}.d.ts`;
         }

         dtsMeta.extension = key.substr(ldot);
         const generator = dtsMeta.extension === ".svg" ? svgGen : cssGen;

         generator!.begin();
         val.forEach((file) => {
            const name = basename(file);
            genDts(file, name.substring(0, name.lastIndexOf(".")), dtsMeta.extension);
         });
         // call before committed as resource module will reset after committed
         if (commitedCallback) {
            commitedCallback(val, dtsMeta.genFile, generator!.getMergeResource(), generator!.getResourceModule());
         }
         generator!.commit(dtsMeta);

      } else {

         // generate dts for each file
         val.forEach((file) => {

            const ldot = file.lastIndexOf(".");

            let name = basename(file);
            name = name.substring(0, name.lastIndexOf("."));

            if (!options.output) {
               const dir = dirname(file);
               dtsMeta.genFile = `${dir}/${name}.d.ts`;
            } else {
               dtsMeta.genFile = `${options.output}/${name}.d.ts`;
            }

            dtsMeta.module = file;
            dtsMeta.extension = file.substr(ldot);

            if (isAbsolute(dtsMeta.module)) {
               dtsMeta.module = dtsMeta.module.replace(root, "");
            }

            const genData = genDts(file, name, dtsMeta.extension, dtsMeta);
            if (commitedCallback) {
               commitedCallback([file], dtsMeta.genFile, genData.raw, genData.resModule);
            }

         });
      }
   }
}

/**
 * Generate wrapped and merged dts file from a mixed of multiple resource such as SVG.
 * @param options command line options
 */
function generateWrapped(options: ICommandLineOptions) {
   const mdir = new Map<string, string[]>();

   // group file by folder, it is simplified the merge process
   options.glob.forEach((file) => {
      const key = dirname(file);
      if (mdir.get(key)) {
         mdir.get(key)!.push(file);
      } else {
         mdir.set(key, [file]);
      }
      if (extname(file) !== ".svg") {
         throw new Error("wrap should be use with svg vector resource.");
      }
   });

   const dtsMeta = {} as IDTSMeta;
   const fileGen = new FileDtsGenerator(options);

   for (const [key, val] of mdir) {
      dtsMeta.module = key;
      dtsMeta.extension = extname(val[0]);
      if (!options.output) {
         dtsMeta.genFile = `${dtsMeta.module}/${basename(key)}${dtsMeta.extension}.d.ts`;
      } else {
         dtsMeta.genFile = `${options.output}/${basename(key)}${dtsMeta.extension}.d.ts`;
      }

      fileGen.begin();
      val.forEach((file) => {
         fileGen.filename(file);
      });
      fileGen.commit(dtsMeta);
   }
}
