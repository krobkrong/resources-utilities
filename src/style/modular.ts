import { CssParseOptions, StyleParser } from '@resmod/style/parser'
import { NameConvension, Selector } from '@resmod/common/convension';
import { CssSelectorType, StyleType } from '@resmod/style/types';
import { ResourceModule, Resources, ResourceMetadata } from '@resmod/webpack/loader/types';

/** A string to append infront of selector */
interface Prefix {
   [index: number]: string
}

/**
 * A css module parser implement style parser interface.
 */
export class CssModuleParser implements StyleParser<ResourceMetadata> {

   private prefix?: Prefix
   private options: CssParseOptions

   /**
    * Create css parser
    * @param options Css parser options
    */
   constructor(options: CssParseOptions) {
      this.options = options
      if (options.prefix) {
         if (!options.prefixCb) {
            this.prefix = prefix(options.convension!)
         }
      }
   }

   /**
    * parsing only css class, id and css variable
    * @param rawCss css raw data as string
    */
   parse(rawCss: string): Resources<ResourceModule, ResourceMetadata> | undefined {

      var ch = 0
      var skipUntil = 0
      var commentSection = false

      var name = new Selector(this.options.convension, this.options.prefix)
      var selectorType: CssSelectorType | undefined

      var appendKey = (selector: string, raw: string) => {
         if (this.options.convensionCb) selector = this.options.convensionCb(selector)
         if (this.options.prefix) {
            if (this.options.prefixCb) {
               selector = `${this.options.prefixCb(selectorType!)}${selector}`
            } else if (this.prefix) {
               selector = `${this.prefix[selectorType!]}${selector}`
            }
         }

         if (cssModule[selector] === undefined) {
            cssModule[selector] = raw
         }
         selectorType = undefined
      }

      var cssModule = {} as ResourceModule
      // Note:
      // 1. we do not interest in style properties such as color, background, padding ...etc
      // 2. we do not interest in selector without class or id
      // 3. we only interest with class and id with or without selector
      // 4. avoid class and id define with unicode
      for (var i = 0; i < rawCss.length; i++) {
         ch = rawCss.charCodeAt(i)
         // everything is skipped until we found the end most likely } and , as next will begining of a new tag or class or id
         if (skipUntil > 0) {
            if (commentSection) {
               // if it follow by a slash that the end of comment section
               if (skipUntil == ch && i < rawCss.length - 1 && rawCss.charCodeAt(i + 1) == 47) {
                  commentSection = false
                  skipUntil = 0
                  i++
               }
               continue
            }

            switch (ch) {
               case skipUntil: // we found the expected character let start trace tag, class and id
                  skipUntil = 0
                  continue

               case 32:    // space consider the end
               case 9:     // tab consider the end
               case 58:    // : (colon) consider the end
               case 44:    // comma consider the end
               case 41:    // ) close parentheses
               case 10:
                  if (selectorType === CssSelectorType.VARIABLE) {
                     appendKey(name.toString(), name.rawString())
                     name.reset()
                  }
                  continue

               case 45:    // - possibly indicate the begining of css variable
                  // if we already detected the variable
                  if (selectorType === undefined) {
                     // -- at the end does not mean variable
                     if (i < rawCss.length - 2 && rawCss.charCodeAt(i + 1) == 45) {
                        if (this.options.cssVariable) {
                           selectorType = CssSelectorType.VARIABLE
                           name.reset()
                           name.appendRaw(45).appendRaw(45)
                           i++
                           // css variable must start with double hyphen only
                           if (rawCss.charCodeAt(i + 2) == 45) {
                              throw 'invalid css syntax on variable name'
                           }
                        }
                     }
                     continue
                  }

               default:
                  if (selectorType === CssSelectorType.VARIABLE) {
                     name.append(ch)
                  }
                  continue
            }
         }
         switch (ch) {
            case 10:    // new line
               continue

            case 47:    // a slash /
               // if it following a start * then it a comment section
               if (i < rawCss.length - 1 && rawCss.charCodeAt(i + 1) == 42) {
                  commentSection = true
                  // skip until a star and follow by a slash
                  skipUntil = 42
               }
               continue

            case 46:    // . indicate the begining of class
               if (this.options.cssClass) {
                  selectorType = CssSelectorType.CLASS
                  name.reset()
                  name.appendRaw(46)
               }
               continue

            case 35:    // # indicate the begining of id
               if (this.options.cssId) {
                  selectorType = CssSelectorType.ID
                  name.reset()
                  name.appendRaw(35)
               }
               continue

            case 32:    // space consider the end
            case 9:     // tab consider the end
            case 44:    // comma consider the end
            case 58:    // colon (:) consider the end
               if (selectorType !== undefined) {
                  appendKey(name.toString(), name.rawString())
                  name.reset()
               }
               continue

            case 123:    // { consider the end however everything is ignored until }
               skipUntil = 125
               if (selectorType !== undefined) {
                  appendKey(name.toString(), name.rawString())
                  name.reset()
               }
               continue

            default:
               if (selectorType === undefined) {
                  continue
               }
               name.append(ch)
         }
      }
      return Object.keys(cssModule).length > 0 && cssModule.constructor === Object ?
         {
            resourceModule: cssModule,
            resourceExtension: ["css"],
            resourceType: StyleType.CSS,
            metadata: { "raw": rawCss },
         } as Resources<ResourceModule, ResourceMetadata> : undefined
   }

}
/** return prefix based on the given convension */
function prefix(convension: NameConvension): Prefix {
   let prefix = {} as Prefix
   switch (convension) {
      case "Snake":
         prefix[CssSelectorType.CLASS] = "CLASS_"
         prefix[CssSelectorType.VARIABLE] = "VAR_"
         prefix[CssSelectorType.ID] = "ID_"
         break

      case "snake":
         prefix[CssSelectorType.CLASS] = "class_"
         prefix[CssSelectorType.VARIABLE] = "var_"
         prefix[CssSelectorType.ID] = "id_"
         break

      case "pascal":
         prefix[CssSelectorType.CLASS] = "Class"
         prefix[CssSelectorType.VARIABLE] = "Var"
         prefix[CssSelectorType.ID] = "Id"
         break

      default:
         prefix[CssSelectorType.CLASS] = "class"
         prefix[CssSelectorType.VARIABLE] = "var"
         prefix[CssSelectorType.ID] = "id"
         break
   }
   return prefix
}
