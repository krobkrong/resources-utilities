import { StyleType } from "@resmod/style/types";
import { VectorType } from "@resmod/vector/types";
import { IGeneratedMetadata } from "@resmod/webpack/plugins/plugin";

/**
 * an interface that listening keyword define in resource that need
 * to be provided to javascript at runtime.
 */
export interface IResourceModule {
   [index: string]: string | IGeneratedMetadata | undefined;
   // use for supply additional info a long default exports module
   __description?: IGeneratedMetadata;
}

/**
 * Serialize resource module into typescript module code.
 * @param rm resource module
 * @param tab space to use as indent
 */
export function SerializeResourceModule(rm: IResourceModule, tab: string = "  "): string {
   let code = "";
   Object.keys(rm).forEach((key) => {
      code += `${tab}export const ${key}: string;\n`;
   });
   return code;
}

/**
 * Serialize resource module into typescript module variable.
 * @param rm resource module
 * @param tab space to use as indent
 */
export function SerializeResourceModuleAsVariable(rm: IResourceModule, tab: string = "  "): string {
   let code = "";
   Object.keys(rm).forEach((key) => {
      code += `${tab}${key}: string\n`;
   });
   return code;
}

/**
 * The object contain raw hierarchy data of resource or a a string raw data.
 */
export interface IResourceMetadata {
   [index: string]: string | IResourceMetadata[] | undefined;
}

/**
 * metadata definition that related to the parsing resource
 */
export interface IResources<T extends IResourceModule, M extends IResourceMetadata> {
   /**
    * a object that content all extract variable or keyword that can be
    * use in javascript directly.
    */
   resourceModule: T;

   /**
    * data to represent resource metadata. The data depend on parsing optoins
    */
   metadata: M;

   /**
    * return type of resource that is parsed.
    */
   resourceType: VectorType | StyleType;

   /**
    * return an extension of file that has been parsed. A single array is
    * return if only one extension found.
    */
   resourceExtension: string[];
}
