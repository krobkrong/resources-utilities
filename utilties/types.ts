import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { relative } from "upath";

export class TypesReplacement {

   public static root: string;
   private static file: string;
   private static alias: string;

   /** Replace typescript definitions file */
   public static replace(file: string, alias: string): string {
      TypesReplacement.file = file;
      TypesReplacement.alias = `@${alias}`;
      let buf = readFileSync(file).toString();
      let regex = new RegExp(`(from\\s+["'])\\${TypesReplacement.alias}(.*)(["'];)`, "gm");
      return buf.replace(regex, TypesReplacement.replacer);
   }

   public static replacer(_import: string, prefix: string, path: string, close: string): string {
      let dir = resolve(dirname(TypesReplacement.file));
      let file = `${TypesReplacement.root}${path}`;
      let ref = relative(dir, file);
      if (!ref.startsWith(".")) {
         ref = `./${ref}`;
      }
      return `${prefix}${ref}${close}`;
   }

}