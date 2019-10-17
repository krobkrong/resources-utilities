import { NameConvension } from "@resmod/common/convension";
import { Selector } from "@resmod/common/selector";
import { ICssParseOptions, IStyleParser } from "@resmod/style/parser";
import { CssSelectorType, StyleType } from "@resmod/style/types";
import { IResourceMetadata, IResourceModule, IResources } from "@resmod/webpack/loader/types";

/** A string to append infront of selector */
interface IPrefix {
   [index: number]: string;
}

/**
 * A css module parser implement style parser interface.
 */
export class CssModuleParser implements IStyleParser<IResourceMetadata> {

   private prefix?: IPrefix;
   private options: ICssParseOptions;

   /**
    * Create css parser
    * @param options Css parser options
    */
   constructor(options: ICssParseOptions) {
      this.options = options;
      if (options.prefix) {
         if (!options.prefixCb) {
            this.prefix = prefix(options.convension!);
         }
      }
   }

   /**
    * parsing only css class, id and css variable
    * @param rawCss css raw data as string
    */
   public parse(rawCss: string): IResources<IResourceModule, IResourceMetadata> | undefined {

      let ch = 0;
      let skipUntil = 0;
      let commentSection = false;

      const name = new Selector(this.options.convension, this.options.prefix);
      let selectorType: CssSelectorType | undefined;

      const appendKey = (selector: string, raw: string) => {
         if (this.options.convensionCb) { selector = this.options.convensionCb(selector); }
         if (this.options.prefix) {
            if (this.options.prefixCb) {
               selector = `${this.options.prefixCb(selectorType!)}${selector}`;
            } else if (this.prefix) {
               selector = `${this.prefix[selectorType!]}${selector}`;
            }
         }

         if (cssModule[selector] === undefined) {
            cssModule[selector] = raw;
         }
         selectorType = undefined;
      };

      const cssModule = {} as IResourceModule;
      // Note:
      // 1. we do not interest in style properties such as color, background, padding ...etc
      // 2. we do not interest in selector without class or id
      // 3. we only interest with class and id with or without selector
      // 4. avoid class and id define with unicode
      for (let i = 0; i < rawCss.length; i++) {
         ch = rawCss.charCodeAt(i);
         // everything is skipped until we found the end most likely } and ,
         // as next will begining of a new tag or class or id
         if (skipUntil > 0) {
            if (commentSection) {
               // if it follow by a slash that the end of comment section
               if (skipUntil === ch && i < rawCss.length - 1 && rawCss.charCodeAt(i + 1) === 47) {
                  commentSection = false;
                  skipUntil = 0;
                  i++;
               }
               continue;
            }

            switch (ch) {
               case skipUntil: // we found the expected character let start trace tag, class and id
                  skipUntil = 0;
                  continue;

               case 32:    // space consider the end
               case 9:     // tab consider the end
               case 58:    // : (colon) consider the end
               case 44:    // comma consider the end
               case 41:    // ) close parentheses
               case 10:
                  if (selectorType === CssSelectorType.VARIABLE) {
                     appendKey(name.toString(), name.rawString());
                     name.reset();
                  }
                  continue;

               case 45:    // - possibly indicate the begining of css variable
                  // if we already detected the variable
                  if (selectorType === undefined) {
                     // -- at the end does not mean variable
                     if (i < rawCss.length - 2 && rawCss.charCodeAt(i + 1) === 45) {
                        if (this.options.cssVariable) {
                           selectorType = CssSelectorType.VARIABLE;
                           name.reset();
                           name.appendRaw(45).appendRaw(45);
                           i++;
                           // css variable must start with double hyphen only
                           if (rawCss.charCodeAt(i + 2) === 45) {
                              throw new Error("invalid css syntax on variable name");
                           }
                        }
                     }
                     continue;
                  }

               default:
                  if (selectorType === CssSelectorType.VARIABLE) {
                     name.append(ch);
                  }
                  continue;
            }
         }
         switch (ch) {
            case 10:    // new line
               continue;

            case 47:    // a slash /
               // if it following a start * then it a comment section
               if (i < rawCss.length - 1 && rawCss.charCodeAt(i + 1) === 42) {
                  commentSection = true;
                  // skip until a star and follow by a slash
                  skipUntil = 42;
               }
               continue;

            case 46:    // . indicate the begining of class
               if (this.options.cssClass) {
                  selectorType = CssSelectorType.CLASS;
                  name.reset();
                  if (!this.options.excludeSelectorSymbol) {
                     name.appendRaw(46);
                  }
               }
               continue;

            case 35:    // # indicate the begining of id
               if (this.options.cssId) {
                  selectorType = CssSelectorType.ID;
                  name.reset();
                  if (!this.options.excludeSelectorSymbol) {
                     name.appendRaw(35);
                  }
               }
               continue;

            case 32:    // space consider the end
            case 9:     // tab consider the end
            case 44:    // comma consider the end
            case 58:    // colon (:) consider the end
               if (selectorType !== undefined) {
                  appendKey(name.toString(), name.rawString());
                  name.reset();
               }
               continue;

            case 123:    // { consider the end however everything is ignored until }
               skipUntil = 125;
               if (selectorType !== undefined) {
                  appendKey(name.toString(), name.rawString());
                  name.reset();
               }
               continue;

            default:
               if (selectorType === undefined) {
                  continue;
               }
               name.append(ch);
         }
      }
      return Object.keys(cssModule).length > 0 && cssModule.constructor === Object ?
         {
            metadata: { raw: rawCss },
            resourceExtension: ["css"],
            resourceModule: cssModule,
            resourceType: StyleType.CSS,
         } as IResources<IResourceModule, IResourceMetadata> : undefined;
   }

}
/** return prefix based on the given convension */
function prefix(convension: NameConvension): IPrefix {
   const iPrefix = {} as IPrefix;
   switch (convension) {
      case "Snake":
         iPrefix[CssSelectorType.CLASS] = "CLASS_";
         iPrefix[CssSelectorType.VARIABLE] = "VAR_";
         iPrefix[CssSelectorType.ID] = "ID_";
         break;

      case "snake":
         iPrefix[CssSelectorType.CLASS] = "class_";
         iPrefix[CssSelectorType.VARIABLE] = "var_";
         iPrefix[CssSelectorType.ID] = "id_";
         break;

      case "pascal":
         iPrefix[CssSelectorType.CLASS] = "Class";
         iPrefix[CssSelectorType.VARIABLE] = "Var";
         iPrefix[CssSelectorType.ID] = "Id";
         break;

      default:
         iPrefix[CssSelectorType.CLASS] = "class";
         iPrefix[CssSelectorType.VARIABLE] = "var";
         iPrefix[CssSelectorType.ID] = "id";
         break;
   }
   return iPrefix;
}
