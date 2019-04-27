import { SvgModuleParser } from "@resmod/vector/svg";
import { VectorType, VectorElementType } from "@resmod/vector/types";
import { NameConvension } from "@resmod/common/convension";
import { ResourceModule, Resources, ResourceMetadata } from "@resmod/loader/types";

/**
 * vector parser option
 */
export interface VectorParseOptions {
   /**
    * If prefix is true then a prefix is append to each original id.
    * For example, text element will has `txt` keyword append. e.g txt_info or txtInfo
    */
   prefix?: boolean
   /**
    * a function to return your own prefix base on the given type.
    */
   prefixCb?: (vector: VectorType, element: VectorElementType) => string
   /**
    * name convension use to transform vector element id.
    * Note: `snake` and `Snake` is the same as snake case (use underscore) however
    * `Snake` product uppercase of all word where `snake` will produce only lowercase
    * of all word. Both transform to upper or lower case regardless of original name.
    */
   convension?: NameConvension
   /**
    * A custom function that provide transformation
    * of the vector element id while parsing the raw vector string.
    */
   convensionCb?: (name: string) => string
}

/**
 * vector parser define method signature to parse raw vector.
 */
export interface VectorParser<T extends ResourceMetadata> {

   /**
    * parse the vector raw in string format into resource module object. It return
    * undefine if nothing found from the raw data.
    * @param rawVector vector raw data.
    */
   parse(rawVector: string): Resources<ResourceModule, T> | undefined

}

/**
 * vector util contain function to parse raw vector into vector module
 */
export namespace VectorUtils {
   /**
    * parsing raw css style to an object represent css hierarchy.
    * @param rawVector vector raw data as string
    * @param options option to provide for parsing setting 
    */
   export function parse(rawVector: string, options?: VectorParseOptions):
      Resources<ResourceModule, ResourceMetadata> | undefined {

      // provide default options
      options = Object.assign({}, {
         deep: false,
         prefix: false,
         convension: "camel",
      } as VectorParseOptions, options)

      // detect content type
      // TODO: use svgo to optimize raw svg first
      rawVector = rawVector.trim()
      switch (typeOf(rawVector)) {
         case VectorType.SVG:
            return new SvgModuleParser(options).parse(rawVector)
         default:
            throw 'Unsupport vector format, support only svg format at the moment.'
      }
   }

   /**
    * return vector type based on the given raw vector data
    * @param rawVector raw vector string
    */
   export function typeOf(rawVector: string): VectorType {
      rawVector = rawVector.trim()
      if (rawVector.indexOf("<svg") > -1) {
         return VectorType.SVG
      }
      throw 'Unsupport vector format, support only svg format at the moment.'
   }
}