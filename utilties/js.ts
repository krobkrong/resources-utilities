import { readFileSync } from "fs";
import { dirname, relative, resolve } from "path";
import { basename } from "upath";

export class JSReplacement {

   public static root: string;

   /** Replace commonjs javascript file */
   public static replaceCommonJS(file: string, alias: string): string {
      JSReplacement.file = file;
      const buf = readFileSync(file).toString();
      const regex = new RegExp(`(require\\(")\\@${alias}(.*"\\);)`, "gm");
      const mm = buf.replace(regex, JSReplacement.replacer);
      return mm;
   }

   public static replacer(_: string, prefix: string, path: string): string {
      const dir = resolve(dirname(JSReplacement.file));
      if (JSReplacement.root === dir) {
         return `${prefix}.${path}`;

      } else if (`${JSReplacement.root}${dirname(path)}` === dir) {
         // reside in the same fullder
         path = basename(path);
         return `${prefix}./${path}`;
      } else {
         path = relative(dir, `${JSReplacement.root}${path}`);
         return `${prefix}${path}`;
      }
   }
   private static file: string;

}
