import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { relative } from "upath";

export class TypesReplacement {

   public static root: string;

   /** Replace typescript definitions file */
   public static replace(file: string, alias: string): string {
      TypesReplacement.file = file;
      TypesReplacement.alias = `@${alias}`;
      const buf = readFileSync(file).toString();
      const regex = new RegExp(`(from\\s+["'])\\${TypesReplacement.alias}(.*)(["'];)`, "gm");
      return buf.replace(regex, TypesReplacement.replacer);
   }

   public static replacer(_: string, prefix: string, path: string, close: string): string {
      const dir = resolve(dirname(TypesReplacement.file));
      const file = `${TypesReplacement.root}${path}`;
      let ref = relative(dir, file);
      if (!ref.startsWith(".")) {
         ref = `./${ref}`;
      }
      return `${prefix}${ref}${close}`;
   }
   private static file: string;
   private static alias: string;

}
