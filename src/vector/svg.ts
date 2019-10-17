import { LowercaseCharacterName, NameConvension, RawValue } from "@resmod/common/convension";
import { AttributeParser } from "@resmod/vector/attr";
import { IVectorParseOptions, IVectorParser } from "@resmod/vector/parser";
import { SvgElementType, VectorType } from "@resmod/vector/types";
import { IResourceMetadata, IResourceModule, IResources } from "@resmod/webpack/loader/types";

/** A string to append infront of variable name of each typescript definition */
export interface IPrefix {
   [index: string]: string;
}

/** Indexing object to store a valid attribute */
interface IAttribute {
   [index: string]: boolean | undefined;
   id?: boolean;
}

/** state of element to describe the behavior of parsing svg module */
export interface IElementParsingMeta {
   /**
    * a valid attribute to include into resource module for generate typescript definition
    */
   attr: IAttribute;
   /**
    * indicate whether the element is a childless element
    */
   childless: boolean;
   /**
    * inidcate whether the child of the element is consider to be a valid resource module.
    */
   childModule: boolean;
}

/** A valid element to include into resource module */
interface IValidElement {
   [index: string]: IElementParsingMeta;
}

/**
 * an object that contain various information about the raw svg data.
 */
export interface ISvgMetadata extends IResourceMetadata {
   /**
    * container raw svg data. The saw svg data will be include depend on the
    * parsing options.
    */
   raw: string;
   /**
    * name of vector element
    */
   name: string;
   /**
    * type of svg vector element
    */
   elementType: SvgElementType;
   /**
    * a text between tag, use with text and tspan tag
    */
   ctext?: string;
   /**
    * a list of child vector element
    */
   childs?: ISvgMetadata[];
}

/**
 * Svg module parser implement vector parser.
 */
export class SvgModuleParser implements IVectorParser<ISvgMetadata> {

   private validSvgElement: IValidElement;
   private attrParser: AttributeParser;
   private includeMeta: boolean;

   /**
    * Create svg vector parser
    * @param options vector parse option
    */
   constructor(options: IVectorParseOptions = {}) {
      this.validSvgElement = validElement();
      this.attrParser = new AttributeParser(options);
      this.includeMeta = options.includeMeta === true;
   }

   // TODO: include accessibility tag such as title and desc
   /**
    * parse the given raw svg data and return resource object.
    *
    * @param rawSvg raw svg vector
    */
   public parse(rawSvg: string): IResources<IResourceModule, ISvgMetadata> | undefined {

      const resModule = {} as IResourceModule;
      let rootMeta: ISvgMetadata | undefined;
      let svgMeta: ISvgMetadata | undefined;

      const tag = new RawValue(LowercaseCharacterName);
      let ch = 0;
      let skipUntil = 60;  // skip until <
      let commentSection = false;
      const stack: ISvgMetadata[] = [];
      let ctext: string | undefined;

      const appendStack = (set: SvgElementType): ISvgMetadata => {
         const child = { name: tag.rawString(), elementType: set } as ISvgMetadata;
         if (svgMeta) {
            if (!svgMeta.childs) {
               svgMeta.childs = [child];
            } else {
               svgMeta.childs.push(child);
            }
         }
         stack.push(child);
         return child;
      };

      const popStack = () => {
         const elmeta = stack.pop();
         svgMeta = stack[stack.length - 1];
         // last element
         if (stack.length === 0) {
            if (elmeta!.name !== "svg") {
               throw new Error(`invalid svg heirachy, expect svg but got ${elmeta!.name}`);
            }
            rootMeta = elmeta;
         }
      };

      const appendTagToHierarchy = () => {
         if (tag.toString().length > 0) {
            const t = tag.toString() as SvgElementType;
            if (!tag.isLocked()) {
               // tag that does not have attribute
               svgMeta = appendStack(t);
               tag.lock();
            }
            if (t === SvgElementType.TEXT || tag.toString() === "tspan") {
               ctext = "";
            } else {
               ctext = undefined;
            }
         }
      };

      for (let index = 0; index < rawSvg.length; index++) {
         ch = rawSvg.charCodeAt(index);

         if (skipUntil > 0) {
            if (skipUntil !== ch) {
               if (ctext !== undefined) {
                  ctext += String.fromCharCode(ch);
               }
               continue;
            } else if (commentSection && rawSvg.substr(index, 3) === "-->") {
               skipUntil = 60; // skip until <
               commentSection = false;
               index += 3;
               continue;
            } else if (skipUntil === 63 && rawSvg.substr(index, 2) === "?>") { // 63 = ? character
               skipUntil = 60; // skip until <
               index += 2;
               continue;
            } else if (ctext !== undefined) {
               ctext = ctext.trim();
               if (ctext) { svgMeta!.ctext = ctext; }
               ctext = undefined;
            }
         }

         switch (ch) {
            case 10:    // new line
            case 32:    // space consider the end
            case 9:     // tab consider the end
               if (tag.toString().length > 0) {
                  // throw if element support to not having child or sometime
                  // invalid syntax without slash (/) before ">"
                  if (svgMeta && this.validSvgElement[svgMeta.elementType] &&
                     this.validSvgElement[svgMeta.elementType] && this.validSvgElement[svgMeta.elementType].childless) {
                     throw new Error(`element should not have any child ${svgMeta.name}`);
                  }

                  const t = tag.toString() as SvgElementType;
                  // do not trace any id of the element that have child but not include as part of resource module.
                  // for example "g" or "mask" is path of valid resource module but it's child element is not
                  // consider as part of resource module.
                  let rmod;
                  if (svgMeta && this.validSvgElement[svgMeta.elementType] &&
                     this.validSvgElement[svgMeta.elementType].childModule) {
                     rmod = resModule;
                  } else {
                     rmod = undefined;
                  }
                  svgMeta = appendStack(t);
                  index = this.attrParser.
                     parseAttribute(rawSvg, index, this.validSvgElement[t], rmod, svgMeta);
                  tag.lock();
               }
               continue;

            case 47: // ascii code = /
               // if encounter >, that mean, tag does not have child
               if (!tag.isEmpty() && rawSvg.charCodeAt(index + 1) === 62) {
                  appendTagToHierarchy();
                  tag.reset();
                  index += 1;
               } else if (tag.isEmpty() || (index < rawSvg.length - 1 && rawSvg.charCodeAt(index + 1) !== 62)) {
                  skipUntil = 62;  // skip until >
                  svgMeta = undefined;
               }
               popStack();
               continue;

            case 60:    // < open tag, start tracing
               // if ? is the next character that mean it's xml prolog let skip it. We don't really care about
               // element change in version 1.0 or 2.0. ID and Element name is all we needed.
               if (index === 0 && rawSvg.length > 3 && rawSvg.charCodeAt(index + 1) === 63) {
                  skipUntil = 63;
                  index += 1;
               } else if (index < rawSvg.length + 1 && rawSvg.charCodeAt(index + 1) === 33) {
                  skipUntil = 45; // skip until hyphen
                  commentSection = true;
               } else {
                  skipUntil = 0;
                  commentSection = false;
               }
               tag.reset();
               continue;

            case 62:    // > end of tag
               appendTagToHierarchy();
               skipUntil = 60; // skip until <
               continue;

            default:
               try {
                  tag.append(ch);
               } catch (e) {
                  throw e;
               }
         }
      }

      return (this.includeMeta || (Object.keys(resModule).length > 0 && resModule.constructor === Object)) ?
         {
            metadata: rootMeta,
            resourceExtension: ["svg"],
            resourceModule: resModule,
            resourceType: VectorType.SVG,
         } as IResources<IResourceModule, ISvgMetadata> : undefined;
   }

}

/** return an indexing object contain information about the valid element */
function validElement(): IValidElement {
   const ve = {} as IValidElement;
   ve[SvgElementType.FILTER] = { childless: false, childModule: false, attr: { id: true } };
   ve[SvgElementType.MASK] = { childless: false, childModule: false, attr: { id: true } };
   ve[SvgElementType.CLIP_PATH] = { childless: false, childModule: false, attr: { id: true } };
   ve[SvgElementType.GROUP] = { childless: false, childModule: false, attr: { id: true } };
   ve[SvgElementType.TEXT] = { childless: false, childModule: false, attr: { id: true } };
   ve[SvgElementType.RECT] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.CIRCLE] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.POLYGON] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.POLYLINE] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.LINE] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.PATH] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.ELLIPSE] = { childless: true, childModule: false, attr: { id: true } };
   ve[SvgElementType.DEFS] = { childless: false, childModule: true, attr: {} };
   ve[SvgElementType.SVG] = { childless: false, childModule: true, attr: {} };
   return ve;
}

/**
 * return an indexing Prefix object which contain the prefix that corresponse to
 * each svg element.
 * @param convension name convension
 */
export function prefix(convension: NameConvension): IPrefix {
   let iPrefix;
   switch (convension) {
      case "Snake":
         iPrefix = {} as IPrefix;
         iPrefix[SvgElementType.FILTER] = "FILTER_";
         iPrefix[SvgElementType.MASK] = "MASK_";
         iPrefix[SvgElementType.CLIP_PATH] = "CLIP_";
         iPrefix[SvgElementType.GROUP] = "GROUP_";
         iPrefix[SvgElementType.TEXT] = "TXT_";
         iPrefix[SvgElementType.RECT] = "RECT_";
         iPrefix[SvgElementType.CIRCLE] = "CIRCLE_";
         iPrefix[SvgElementType.POLYGON] = "POLYGON_";
         iPrefix[SvgElementType.POLYLINE] = "POLYLINE_";
         iPrefix[SvgElementType.LINE] = "LINE_";
         iPrefix[SvgElementType.PATH] = "PATH_";
         iPrefix[SvgElementType.ELLIPSE] = "ELLIPSE_";

         return iPrefix;

      case "snake":
         iPrefix = {} as IPrefix;
         iPrefix[SvgElementType.FILTER] = "filter_";
         iPrefix[SvgElementType.MASK] = "mask_";
         iPrefix[SvgElementType.CLIP_PATH] = "clip_";
         iPrefix[SvgElementType.GROUP] = "group_";
         iPrefix[SvgElementType.TEXT] = "txt_";
         iPrefix[SvgElementType.RECT] = "rect_";
         iPrefix[SvgElementType.CIRCLE] = "circle_";
         iPrefix[SvgElementType.POLYGON] = "polygon_";
         iPrefix[SvgElementType.POLYLINE] = "polyline_";
         iPrefix[SvgElementType.LINE] = "line_";
         iPrefix[SvgElementType.PATH] = "path_";
         iPrefix[SvgElementType.ELLIPSE] = "ellipse_";

         return iPrefix;

      case "pascal":
         iPrefix = {} as IPrefix;
         iPrefix[SvgElementType.FILTER] = "Filter";
         iPrefix[SvgElementType.MASK] = "Mask";
         iPrefix[SvgElementType.CLIP_PATH] = "Clip";
         iPrefix[SvgElementType.GROUP] = "Group";
         iPrefix[SvgElementType.TEXT] = "Txt";
         iPrefix[SvgElementType.RECT] = "Rect";
         iPrefix[SvgElementType.CIRCLE] = "Circle";
         iPrefix[SvgElementType.POLYGON] = "Polygon";
         iPrefix[SvgElementType.POLYLINE] = "Polyline";
         iPrefix[SvgElementType.LINE] = "Line";
         iPrefix[SvgElementType.PATH] = "Path";
         iPrefix[SvgElementType.ELLIPSE] = "Ellipse";

         return iPrefix;

      default:
         iPrefix = {} as IPrefix;
         iPrefix[SvgElementType.FILTER] = "filter";
         iPrefix[SvgElementType.MASK] = "mask";
         iPrefix[SvgElementType.CLIP_PATH] = "clip";
         iPrefix[SvgElementType.GROUP] = "group";
         iPrefix[SvgElementType.TEXT] = "txt";
         iPrefix[SvgElementType.RECT] = "rect";
         iPrefix[SvgElementType.CIRCLE] = "circle";
         iPrefix[SvgElementType.POLYGON] = "polygon";
         iPrefix[SvgElementType.POLYLINE] = "polyline";
         iPrefix[SvgElementType.LINE] = "line";
         iPrefix[SvgElementType.PATH] = "path";
         iPrefix[SvgElementType.ELLIPSE] = "ellipse";

         return iPrefix;
   }
}

/**
 *
 */
export interface ISvgSerializeOptions {
   merge?: boolean;
   id?: string;
   skipSvg?: boolean;
   tab?: string;
   useGivenId?: boolean;
}

/**
 * Serialize resource metadata into it origin form.
 * @param rm a resource metadata
 * @param tab space to use as indent
 */
export function SerializeSvgResourceMetadata(rootRM: IResourceMetadata, opt: ISvgSerializeOptions = {}): string {
   let hierarchies: IResourceMetadata[];
   let wrapInSymbol: boolean;

   if (opt.skipSvg === undefined || opt.skipSvg === null) { opt.skipSvg = true; }
   if (!opt.tab) { opt.tab = "   "; }
   if (opt.useGivenId && !opt.id) { throw new Error("must provide id when option useGivenId is set to true."); }

   if (opt.skipSvg && rootRM.elementType === SvgElementType.SVG && (rootRM as ISvgMetadata).childs) {
      hierarchies = (rootRM as ISvgMetadata).childs!;
      wrapInSymbol = rootRM.viewBox !== undefined && rootRM.width !== undefined && rootRM.height !== undefined;
   } else {
      hierarchies = [rootRM];
      wrapInSymbol = false;
   }

   const attrSerialize = (rm: IResourceMetadata, ignoreId: boolean): string => {
      const keys = Object.keys(rm);
      let buf = "";
      keys.forEach((key) => {
         if (key === "ctext" || key === "name" || key === "childs" || key === "raw" || key === "elementType") {
            return;
         }
         if ((ignoreId || opt.merge) && key === "id") {
            return;
         }
         buf += ` ${key}="${rm[key]}"`;
      });
      return buf;
   };

   const isSymbolable = (svgMeta: ISvgMetadata): boolean => {
      return svgMeta.elementType === SvgElementType.CIRCLE ||
         svgMeta.elementType === SvgElementType.RECT ||
         svgMeta.elementType === SvgElementType.POLYGON ||
         svgMeta.elementType === SvgElementType.POLYLINE ||
         svgMeta.elementType === SvgElementType.ELLIPSE ||
         svgMeta.elementType === SvgElementType.PATH ||
         svgMeta.elementType === SvgElementType.LINE ||
         svgMeta.elementType === SvgElementType.TEXT ||
         svgMeta.elementType === SvgElementType.GROUP;
   };

   let traverse: (hr: IResourceMetadata[], indent: string, level: number) => string;
   traverse = (hr: IResourceMetadata[], indent: string, level: number): string => {
      let buf = "";
      hr.forEach((rm) => {
         const svgMeta = rm as ISvgMetadata;
         const wrap = level === 0 && wrapInSymbol;
         const indentWrap = wrap ? indent + opt.tab : indent;

         const eleid = ` id="${(rm.id && !opt.useGivenId) ? rm.id as string : opt.id!}"`;
         const isSymbol = wrap && isSymbolable(svgMeta);
         let elementID = "";
         if (!isSymbol && level === 0) {
            elementID = eleid;
         }

         let eleBuf = `${indentWrap}<${svgMeta.name}${elementID}${attrSerialize(rm, wrap)}`;
         if (svgMeta.childs) {
            eleBuf += ">\n";
            eleBuf += traverse(svgMeta.childs, indentWrap + opt.tab, level + 1);
            eleBuf += `${indentWrap}</${svgMeta.name}>\n`;
         } else if (svgMeta.ctext !== undefined) {
            eleBuf += `>${svgMeta.ctext!}</${svgMeta.name}>\n`;
         } else {
            eleBuf += `></${svgMeta.name}>\n`;
         }

         if (isSymbol) {
            buf += `${indent}<symbol${eleid} width="${rootRM.width}" height="${rootRM.height}" viewBox="${rootRM.viewBox}">\n`;
            buf += `${eleBuf}`;
            buf += `${indent}</symbol>\n`;
         } else {
            // TODO: check accessibility like title & desc 'description' to be properly included.
            buf += eleBuf;
         }
      });
      return buf;
   };

   return traverse(hierarchies, "", 0);
}
