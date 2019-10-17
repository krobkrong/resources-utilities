
import { NameConvension } from "@resmod/common/convension";
import { CssModuleParser } from "@resmod/style/modular";
import { CssSelectorType } from "@resmod/style/types";
import { IResourceMetadata, IResourceModule, IResources } from "@resmod/webpack/loader/types";

/**
 * Css parsing options giving a different choice to the desired result.
 */
export interface ICssParseOptions {
   /**
    * True if id should be included in the result.
    * By default it, included.
    */
   cssId?: boolean;
   /**
    * True if css variable should be included in the result.
    * By default it, included.
    */
   cssVariable?: boolean;
   /**
    * True if class should be included in the result otherwise class is ignored.
    * By default it, included.
    */
   cssClass?: boolean;
   /**
    * True if class and id should be exclude the symbol such as # or . from module otherwise
    * It's included. By default, the symbol is included.
    */
   excludeSelectorSymbol?: boolean;
   /**
    * If true then a prefix is append to each original selector or variable.
    *
    * - class selector will has `class` keyword append. e.g class_info or classInfo
    * - id selector will has `id` keyword append. e.g id_info or idInfo
    * - variable will has `var` keyword append. e.g var_info or varInfo
    */
   prefix?: boolean;
   /**
    * a function to return your own prefix base on the given type.
    */
   prefixCb?: (type: CssSelectorType) => string;
   /**
    * name convension use to transform css selector class, id or css variable.
    * Note: `snake` and `Snake` is the same as snake case (use underscore) however
    * `Snake` product uppercase of all word where `snake` will produce only lowercase
    * of all word. Both transform to upper or lower case regardless of original name.
    */
   convension?: NameConvension;
   /**
    * A custom function that provide transformation
    * of css selector class, id or css variable while parsing the raw css string.
    */
   convensionCb?: (name: string) => string;
}

/**
 * An interface definition define a parser method signature.
 */
export interface IStyleParser<T extends IResourceMetadata> {

   /**
    * parse the vector raw in string format into resource module object. It return
    * undefine if nothing found from the raw data.
    * @param rawVector vector raw data.
    */
   parse(rawCss: string): IResources<IResourceModule, T> | undefined;

}

/**
 * style util contain function that parse raw css and return css module.
 */
export class StyleUtils {
   /**
    * parsing raw css style to an object represent css hierarchy.
    * @param rawCss css raw data as string
    * @param options option to provide for parsing setting
    */
   public static parse(
      rawCss: string,
      options?: ICssParseOptions): IResources<IResourceModule, IResourceMetadata> | undefined {
      options = Object.assign({}, {
         convension: "camel",
         cssClass: true,
         cssId: true,
         cssVariable: true,
      } as ICssParseOptions, options);
      return new CssModuleParser(options).parse(rawCss);
   }
}
