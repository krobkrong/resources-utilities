import { VectorType } from "@resmod/vector/types";
import { StyleType } from "@resmod/style/types";

/**
 * an interface that listening keyword define in resource that need
 * to be provided to javascript at runtime.
 */
export interface ResourceModule {
   [index: string]: string
}

/**
 * Serialize resource module into typescript code.
 */
export function SerializeResourceModule(rm: ResourceModule, tab: string = "  "): string {
   var code = ""
   Object.keys(rm).forEach(key => {
      code += `${tab}export const ${key}: string\n`
   })
   return code
}

/**
 * The object contain raw hierarchy data of resource or a a string raw data.
 */
export interface ResourceMetadata {
   [index: string]: string | ResourceMetadata[]
}

/**
 * metadata definition that related to the parsing resource
 */
export interface Resources<T extends ResourceModule, M extends ResourceMetadata> {
   /**
    * a object that content all extract variable or keyword that can be
    * use in javascript directly.
    */
   resourceModule: T

   /**
    * data to represent resource metadata. The data depend on parsing optoins
    */
   metadata: M

   /**
    * return type of resource that is parsed.
    */
   resourceType: VectorType | StyleType

   /**
    * return an extension of file that has been parsed. A single array is
    * return if only one extension found.
    */
   resourceExtension: string[]
}