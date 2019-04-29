import { readFileSync } from "fs";
import { dirname, resolve } from "path";

export class TypesReplacement {

   public static root: string
   private static file: string

   /** Replace typescript definitions file */
   public static replace(file: string, alias: string): string {
      TypesReplacement.file = file
      let buf = readFileSync(file).toString()
      let regex = new RegExp(`(from\\s+["'])\\@${alias}(.*["'];)`, "gm")
      return buf.replace(regex, TypesReplacement.replacer)
   }

   public static replacer(_: string, prefix: string, path: string): string {
      let rep: string

      let dir = resolve(dirname(TypesReplacement.file))
      if (TypesReplacement.root === dir) {
         rep = "."
      } else if (`${TypesReplacement.root}${dirname(path)}` === dir) {
         rep = "."
         let slash = path.indexOf("/", 1)
         path = path.substr(slash)
      } else {
         rep = ".."
      }

      return `${prefix}${rep}${path}`
   }

}