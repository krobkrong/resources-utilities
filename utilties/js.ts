import { readFileSync } from "fs";
import { dirname, resolve, relative } from "path";
import { basename } from "upath";


export class JSReplacement {

   public static root: string
   private static file: string

   /** Replace commonjs javascript file */
   public static replaceCommonJS(file: string, alias: string): string {
      JSReplacement.file = file
      let buf = readFileSync(file).toString()
      let regex = new RegExp(`(require\\(")\\@${alias}(.*"\\);)`, "gm")
      let mm = buf.replace(regex, JSReplacement.replacer)
      return mm
   }

   public static replacer(_: string, prefix: string, path: string): string {
      let dir = resolve(dirname(JSReplacement.file))
      if (JSReplacement.root === dir) {
         return `${prefix}.${path}`

      } else if (`${JSReplacement.root}${dirname(path)}` === dir) {
         // reside in the same fullder
         path = basename(path)
         return `${prefix}./${path}`
      } else {
         path = relative(dir, `${JSReplacement.root}${path}`)
         return `${prefix}${path}`
      }
   }

}