import { NameConvension } from "@resmod/common/convension";
import { SvgModuleParser } from "@resmod/vector/svg";
import { VectorElementType, VectorType } from "@resmod/vector/types";
import { IResourceMetadata, IResourceModule, IResources } from "@resmod/webpack/loader/types";

/**
 * vector parser option
 */
export interface IVectorParseOptions {
   /**
    * If prefix is true then a prefix is append to each original id.
    * For example, text element will has `txt` keyword append. e.g txt_info or txtInfo
    */
   prefix?: boolean;
   /**
    * a function to return your own prefix base on the given type.
    */
   prefixCb?: (vector: VectorType, element: VectorElementType) => string;
   /**
    * name convension use to transform vector element id.
    * Note: `snake` and `Snake` is the same as snake case (use underscore) however
    * `Snake` product uppercase of all word where `snake` will produce only lowercase
    * of all word. Both transform to upper or lower case regardless of original name.
    */
   convension?: NameConvension;
   /**
    * A custom function that provide transformation
    * of the vector element id while parsing the raw vector string.
    */
   convensionCb?: (name: string) => string;
   /**
    * include metadata even no id found to be used as resources module.
    */
   includeMeta?: boolean;
}

/**
 * vector parser define method signature to parse raw vector.
 */
export interface IVectorParser<T extends IResourceMetadata> {

   /**
    * parse the vector raw in string format into resource module object. It return
    * undefine if nothing found from the raw data.
    * @param rawVector vector raw data.
    */
   parse(rawVector: string): IResources<IResourceModule, T> | undefined;

}

/**
 * vector util contain function to parse raw vector into vector module
 */
export class VectorUtils {
   /**
    * parsing raw css style to an object represent css hierarchy.
    * @param rawVector vector raw data as string
    * @param options option to provide for parsing setting
    */
   public static parse(rawVector: string, options?: IVectorParseOptions):
      IResources<IResourceModule, IResourceMetadata> | undefined {

      // provide default options
      options = Object.assign({}, {
         convension: "camel",
         deep: false,
         prefix: false,
      } as IVectorParseOptions, options);

      // detect content type
      // TODO: use svgo to optimize raw svg first
      rawVector = rawVector.trim();
      switch (this.typeOf(rawVector)) {
         case VectorType.SVG:
            return new SvgModuleParser(options).parse(rawVector);
         default:
            throw new Error("Unsupport vector format, support only svg format at the moment.");
      }
   }

   /**
    * return vector type based on the given raw vector data
    * @param rawVector raw vector string
    */
   public static typeOf(rawVector: string): VectorType {
      rawVector = rawVector.trim();
      if (rawVector.indexOf("<svg") > -1) {
         return VectorType.SVG;
      }
      throw new Error("Unsupport vector format, support only svg format at the moment.");
   }
}
