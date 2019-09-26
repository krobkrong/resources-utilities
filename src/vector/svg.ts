import { VectorParseOptions, VectorParser } from "@resmod/vector/parser";
import { NameConvension, RawValue, Selector, LowercaseCharacterName, AlphabetCharacterName } from "@resmod/common/convension";
import { SvgElementType, VectorType, VectorElementType } from "@resmod/vector/types";
import { ResourceModule, Resources, ResourceMetadata } from "@resmod/webpack/loader/types";

/** A string to append infront of variable name of each typescript definition */
interface Prefix {
   [index: string]: string
}

/** Indexing object to store a valid attribute */
interface Attribute {
   [index: string]: boolean | undefined
   id?: boolean
}

/** state of element to describe the behavior of parsing svg module */
interface ElementParsingMeta {
   /**
    * a valid attribute to include into resource module for generate typescript definition
    */
   attr: Attribute
   /**
    * indicate whether the element is a childless element
    */
   childless: boolean
   /**
    * inidcate whether the child of the element is consider to be a valid resource module.
    */
   childModule: boolean
}

/** A valid element to include into resource module */
interface ValidElement {
   [index: string]: ElementParsingMeta
}

/**
 * an object that contain various information about the raw svg data.
 */
export interface SvgMetadata extends ResourceMetadata {
   /**
    * container raw svg data. The saw svg data will be include depend on the
    * parsing options.
    */
   raw: string
   /**
    * name of vector element
    */
   name: string
   /**
    * type of svg vector element
    */
   elementType: SvgElementType
   /**
    * a text between tag, use with text and tspan tag
    */
   ctext?: string
   /**
    * a list of child vector element
    */
   childs?: SvgMetadata[]
}

/** a class that only parse attribute of each tag of svg element */
class AttributeParser {

   private attr: RawValue
   private val: RawValue
   private transVal: Selector

   private namePrefix?: Prefix
   private convensionCb?: (name: string) => string
   private prefixCb?: (vector: VectorType, element: VectorElementType) => string

   /**
    * Create attribute parser
    * @param options vector parse options
    */
   constructor(options: VectorParseOptions) {
      this.attr = new RawValue(AlphabetCharacterName)
      this.val = new RawValue()
      this.transVal = new Selector(options.convensionCb ? undefined : options.convension, options.prefix)
      this.convensionCb = options.convensionCb
      if (options.prefix) {
         if (options.prefixCb) {
            this.prefixCb = options.prefixCb
         } else {
            this.namePrefix = prefix(options!.convension!)
         }
      }
   }

   /**
    * Parse the attribute from the given raw svg vector
    * @param raw a raw svg vector
    * @param index the started index
    * @param validAttr an index attribute describe the valid attribute to include into resource module
    * @param resMod a resource module object
    * @param svgMeta an svg metadata
    */
   public parseAttribute(raw: string, index: number,
      validElement: ElementParsingMeta | undefined,
      resMod: ResourceModule | undefined,
      svgMeta: SvgMetadata): number {

      var ch = 0, openCh = 0
      this.attr.reset()
      this.val.reset()
      this.transVal.reset()

      for (; index < raw.length; index++) {
         ch = raw.charCodeAt(index)

         switch (ch) {
            case 10:    // new line
            case 32:    // space consider the end
            case 9:     // tab consider the end
               if (!this.attr.isLocked() && this.attr.toString().length > 0) {
                  this.attr.lock()
               }
               if (openCh == 0) {
                  continue
               } else {
                  this.val.append(ch)
                  this.transVal.append(ch)
               }

            case 61:    // = end of attribute
               this.attr.lock()
               continue

            case 34:    // " start or end id value
            case 39:    // ' start or end id value
               if (openCh > 0 && openCh == ch) {
                  // the end of value
                  let elAttr = this.attr.toString()
                  svgMeta[elAttr] = this.val.toString()
                  if (validElement && validElement.attr[elAttr]) {
                     var tval = this.transVal.toString()
                     if (this.convensionCb) {
                        tval = this.convensionCb(tval)
                     }
                     if (this.prefixCb) {
                        tval = `${this.prefixCb(VectorType.SVG, svgMeta.elementType)}${tval}`
                     } else if (this.namePrefix) {
                        tval = `${this.namePrefix[svgMeta.elementType]}${tval}`
                     }
                     if (resMod) {
                        resMod[tval] = this.val.toString()
                     }
                  }
                  this.reset()
                  openCh = 0
               } else {
                  openCh = ch
               }
               continue

            case 62:    // > the end of element
            case 47:    // / trailer slash
               if (openCh == 0) {
                  // the end of element
                  return index - 1
               }

            default:
               if (openCh > 0) {
                  this.val.append(ch)
                  if (validElement && validElement.attr[this.attr.toString()]) {
                     this.transVal.append(ch)
                  }
               } else {
                  this.attr.append(ch)
               }

         }
      }
      throw 'unexpected error'
   }

   /**
    * reset the state of attribute tracing to it initial state.
    */
   public reset() {
      this.attr.reset()
      this.val.reset()
      this.transVal.reset()
   }

}

/**
 * Svg module parser implement vector parser.
 */
export class SvgModuleParser implements VectorParser<SvgMetadata> {

   private validSvgElement: ValidElement
   private attrParser: AttributeParser
   private includeMeta: boolean

   /**
    * Create svg vector parser
    * @param options vector parse option
    */
   constructor(options: VectorParseOptions = {}) {
      this.validSvgElement = validElement()
      this.attrParser = new AttributeParser(options)
      this.includeMeta = options.includeMeta === true
   }

   // TODO: include accessibility tag such as title and desc
   /**
    * parse the given raw svg data and return resource object.
    * 
    * @param rawSvg raw svg vector
    */
   parse(rawSvg: string): Resources<ResourceModule, SvgMetadata> | undefined {

      var resModule = {} as ResourceModule
      var rootMeta: SvgMetadata | undefined, svgMeta: SvgMetadata | undefined

      var tag = new RawValue(LowercaseCharacterName)
      var ch = 0
      var skipUntil = 60  // skip until <
      var commentSection = false
      var stack: SvgMetadata[] = []
      var ctext: string | undefined

      let appendStack = (set: SvgElementType): SvgMetadata => {
         let child = { name: tag.rawString(), elementType: set } as SvgMetadata
         if (svgMeta) {
            if (!svgMeta.childs) {
               svgMeta.childs = [child]
            } else {
               svgMeta.childs.push(child)
            }
         }
         stack.push(child)
         return child
      }

      let popStack = () => {
         let elmeta = stack.pop()
         svgMeta = stack[stack.length - 1]
         // last element
         if (stack.length == 0) {
            if (elmeta!.name != "svg") {
               throw `invalid svg heirachy, expect svg but got ${elmeta!.name}`
            }
            rootMeta = elmeta
         }
      }

      let appendTagToHierarchy = () => {
         if (tag.toString().length > 0) {
            let t = tag.toString() as SvgElementType
            if (!tag.isLocked()) {
               // tag that does not have attribute
               svgMeta = appendStack(t)
               tag.lock()
            }
            if (t == SvgElementType.TEXT || tag.toString() === "tspan") {
               ctext = ""
            } else {
               ctext = undefined
            }
         }
      }

      for (var index = 0; index < rawSvg.length; index++) {
         ch = rawSvg.charCodeAt(index)

         if (skipUntil > 0) {
            if (skipUntil != ch) {
               if (ctext !== undefined) {
                  ctext += String.fromCharCode(ch)
               }
               continue
            } else if (commentSection && rawSvg.substr(index, 3) === '-->') {
               skipUntil = 60 // skip until <
               commentSection = false
               index += 3
               continue
            } else if (skipUntil == 63 && rawSvg.substr(index, 2) === '?>') { // 63 = ? character
               skipUntil = 60 // skip until <
               index += 2
               continue
            } else if (ctext !== undefined) {
               ctext = ctext.trim()
               if (ctext) svgMeta!.ctext = ctext
               ctext = undefined
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
                     throw `element should not have any child ${svgMeta.name}`
                  }

                  let t = tag.toString() as SvgElementType
                  // do not trace any id of the element that have child but not include as part of resource module.
                  // for example "g" or "mask" is path of valid resource module but it's child element is not
                  // consider as part of resource module.
                  let rmod
                  if (svgMeta && this.validSvgElement[svgMeta.elementType] &&
                     this.validSvgElement[svgMeta.elementType].childModule) {
                     rmod = resModule
                  } else {
                     rmod = undefined
                  }
                  svgMeta = appendStack(t)
                  index = this.attrParser.
                     parseAttribute(rawSvg, index, this.validSvgElement[t], rmod, svgMeta)
                  tag.lock()
               }
               continue

            case 47: // ascii code = /
               // if encounter >, that mean, tag does not have child
               if (!tag.isEmpty() && rawSvg.charCodeAt(index + 1) == 62) {
                  appendTagToHierarchy()
                  tag.reset()
                  index += 1;
               } else if (tag.isEmpty() || (index < rawSvg.length - 1 && rawSvg.charCodeAt(index + 1) != 62)) {
                  skipUntil = 62  // skip until >
                  svgMeta = undefined
               }
               popStack()
               continue

            case 60:    // < open tag, start tracing
               // if ? is the next character that mean it's xml prolog let skip it. We don't really care about
               // element change in version 1.0 or 2.0. ID and Element name is all we needed.
               if (index == 0 && rawSvg.length > 3 && rawSvg.charCodeAt(index + 1) == 63) {
                  skipUntil = 63
                  index += 1
               }
               // if ! is the next character that mean this is a comment
               else if (index < rawSvg.length + 1 && rawSvg.charCodeAt(index + 1) == 33) {
                  skipUntil = 45 // skip until hyphen
                  commentSection = true
               } else {
                  skipUntil = 0
                  commentSection = false
               }
               tag.reset()
               continue

            case 62:    // > end of tag
               appendTagToHierarchy()
               skipUntil = 60 // skip until <
               continue

            default:
               try {
                  tag.append(ch)
               } catch (e) {
                  throw e
               }
         }
      }

      return (this.includeMeta || (Object.keys(resModule).length > 0 && resModule.constructor === Object)) ?
         {
            resourceModule: resModule,
            resourceExtension: ["svg"],
            resourceType: VectorType.SVG,
            metadata: rootMeta,
         } as Resources<ResourceModule, SvgMetadata> : undefined
   }

}

/** return an indexing object contain information about the valid element */
function validElement(): ValidElement {
   let ve = {} as ValidElement
   ve[SvgElementType.FILTER] = { childless: false, childModule: false, attr: { id: true } }
   ve[SvgElementType.MASK] = { childless: false, childModule: false, attr: { id: true } }
   ve[SvgElementType.CLIP_PATH] = { childless: false, childModule: false, attr: { id: true } }
   ve[SvgElementType.GROUP] = { childless: false, childModule: false, attr: { id: true } }
   ve[SvgElementType.TEXT] = { childless: false, childModule: false, attr: { id: true } }
   ve[SvgElementType.RECT] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.CIRCLE] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.POLYGON] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.POLYLINE] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.LINE] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.PATH] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.ELLIPSE] = { childless: true, childModule: false, attr: { id: true } }
   ve[SvgElementType.DEFS] = { childless: false, childModule: true, attr: {} }
   ve[SvgElementType.SVG] = { childless: false, childModule: true, attr: {} }
   return ve
}

/**
 * return an indexing Prefix object which contain the prefix that corresponse to
 * each svg element.
 * @param convension name convension
 */
function prefix(convension: NameConvension): Prefix {
   let prefix
   switch (convension) {
      case "Snake":
         prefix = {} as Prefix
         prefix[SvgElementType.FILTER] = "FILTER_"
         prefix[SvgElementType.MASK] = "MASK_"
         prefix[SvgElementType.CLIP_PATH] = "CLIP_"
         prefix[SvgElementType.GROUP] = "GROUP_"
         prefix[SvgElementType.TEXT] = "TXT_"
         prefix[SvgElementType.RECT] = "RECT_"
         prefix[SvgElementType.CIRCLE] = "CIRCLE_"
         prefix[SvgElementType.POLYGON] = "POLYGON_"
         prefix[SvgElementType.POLYLINE] = "POLYLINE_"
         prefix[SvgElementType.LINE] = "LINE_"
         prefix[SvgElementType.PATH] = "PATH_"
         prefix[SvgElementType.ELLIPSE] = "ELLIPSE_"

         return prefix

      case "snake":
         prefix = {} as Prefix
         prefix[SvgElementType.FILTER] = "filter_"
         prefix[SvgElementType.MASK] = "mask_"
         prefix[SvgElementType.CLIP_PATH] = "clip_"
         prefix[SvgElementType.GROUP] = "group_"
         prefix[SvgElementType.TEXT] = "txt_"
         prefix[SvgElementType.RECT] = "rect_"
         prefix[SvgElementType.CIRCLE] = "circle_"
         prefix[SvgElementType.POLYGON] = "polygon_"
         prefix[SvgElementType.POLYLINE] = "polyline_"
         prefix[SvgElementType.LINE] = "line_"
         prefix[SvgElementType.PATH] = "path_"
         prefix[SvgElementType.ELLIPSE] = "ellipse_"

         return prefix

      case "pascal":
         prefix = {} as Prefix
         prefix[SvgElementType.FILTER] = "Filter"
         prefix[SvgElementType.MASK] = "Mask"
         prefix[SvgElementType.CLIP_PATH] = "Clip"
         prefix[SvgElementType.GROUP] = "Group"
         prefix[SvgElementType.TEXT] = "Txt"
         prefix[SvgElementType.RECT] = "Rect"
         prefix[SvgElementType.CIRCLE] = "Circle"
         prefix[SvgElementType.POLYGON] = "Polygon"
         prefix[SvgElementType.POLYLINE] = "Polyline"
         prefix[SvgElementType.LINE] = "Line"
         prefix[SvgElementType.PATH] = "Path"
         prefix[SvgElementType.ELLIPSE] = "Ellipse"

         return prefix

      default:
         prefix = {} as Prefix
         prefix[SvgElementType.FILTER] = "filter"
         prefix[SvgElementType.MASK] = "mask"
         prefix[SvgElementType.CLIP_PATH] = "clip"
         prefix[SvgElementType.GROUP] = "group"
         prefix[SvgElementType.TEXT] = "txt"
         prefix[SvgElementType.RECT] = "rect"
         prefix[SvgElementType.CIRCLE] = "circle"
         prefix[SvgElementType.POLYGON] = "polygon"
         prefix[SvgElementType.POLYLINE] = "polyline"
         prefix[SvgElementType.LINE] = "line"
         prefix[SvgElementType.PATH] = "path"
         prefix[SvgElementType.ELLIPSE] = "ellipse"

         return prefix
   }
}

/**
 * Serialize resource metadata into it origin form.
 * @param rm a resource metadata
 * @param tab space to use as indent
 */
export function SerializeSvgResourceMetadata(rootRM: ResourceMetadata, merge?: boolean, id?: string, skipSvg: boolean = true, tab: string = "  "): string {
   let hierarchies: ResourceMetadata[]
   let wrapInSymbol: boolean
   if (skipSvg && (rootRM as SvgMetadata).childs) {
      hierarchies = (rootRM as SvgMetadata).childs!
      wrapInSymbol = rootRM["viewBox"] !== undefined && rootRM["width"] !== undefined && rootRM["height"] !== undefined
   } else {
      hierarchies = [rootRM]
      wrapInSymbol = false
   }

   var attrSerialize = (rm: ResourceMetadata, ignoreId: boolean): string => {
      let keys = Object.keys(rm)
      var buf = ""
      keys.forEach(key => {
         if (key === "ctext" || key === "name" || key === "childs" || key === "raw" || key === "elementType") {
            return
         }
         if ((ignoreId || merge) && key === "id") {
            return
         }
         buf += ` ${key}="${rm[key]}"`
      })
      return buf
   }

   var isSymbolable = (svgMeta: SvgMetadata): boolean => {
      return svgMeta.elementType == SvgElementType.CIRCLE ||
         svgMeta.elementType == SvgElementType.RECT ||
         svgMeta.elementType == SvgElementType.POLYGON ||
         svgMeta.elementType == SvgElementType.POLYLINE ||
         svgMeta.elementType == SvgElementType.ELLIPSE ||
         svgMeta.elementType == SvgElementType.PATH ||
         svgMeta.elementType == SvgElementType.LINE ||
         svgMeta.elementType == SvgElementType.TEXT ||
         svgMeta.elementType == SvgElementType.GROUP
   }

   var traverse: (hr: ResourceMetadata[], indent: string, level: number) => string
   traverse = (hr: ResourceMetadata[], indent: string, level: number): string => {
      var buf = ""
      hr.forEach(rm => {
         let eleid: string = rm["id"] ? rm["id"] as string : id!
         let svgMeta = rm as SvgMetadata
         let wrap = level === 0 && wrapInSymbol
         let indentWrap = wrap ? indent + tab : indent

         var eleBuf = `${indentWrap}<${svgMeta.name}${attrSerialize(rm, wrap)}`
         if (svgMeta.childs) {
            eleBuf += ">\n"
            eleBuf += traverse(svgMeta.childs, indentWrap + tab, level + 1)
            eleBuf += `${indentWrap}</${svgMeta.name}>\n`
         } else if (svgMeta.ctext !== undefined) {
            eleBuf += `>${svgMeta.ctext!}</${svgMeta.name}>\n`
         } else {
            eleBuf += `></${svgMeta.name}>\n`
         }

         if (wrap && isSymbolable(svgMeta)) {
            buf += `${indent}<symbol id="${eleid}" width="${rootRM["width"]}" height="${rootRM["height"]}" viewBox="${rootRM["viewBox"]}">\n`
            buf += `${eleBuf}`
            buf += `${indent}</symbol>\n`
         } else {
            // TODO: check accessibility like title & desc 'description' to be properly included.
            buf += eleBuf
         }
      })
      return buf
   }

   return traverse(hierarchies, "", 0)
}