import { readFileSync } from "fs";
import { dirname, resolve } from "path";


export class JSReplacement {

   public static root: string
   private static file: string

   /** Replace commonjs javascript file */
   public static replaceCommonJS(file: string, alias: string): string {
      JSReplacement.file = file
      let buf = readFileSync(file).toString()
      let regex = new RegExp(`(require\\(")\\@${alias}(.*"\\);)`, "gm")
      return buf.replace(regex, JSReplacement.replacer)
   }

   public static replacer(_: string, prefix: string, path: string): string {
      let rep: string

      let dir = resolve(dirname(JSReplacement.file))
      if (JSReplacement.root === dir) {
         rep = "."
      } else if (`${JSReplacement.root}${dirname(path)}` === dir) {
         rep = "."
         let slash = path.indexOf("/", 1)
         path = path.substr(slash)
      } else {
         rep = ".."
      }

      return `${prefix}${rep}${path}`
   }

}