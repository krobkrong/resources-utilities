import { existsSync, mkdirSync } from "fs";

export function mkdirSyncRecursive(dir: string) {
   const path = dir.replace(/\/$/, "").split("/");
   for (let i = 1; i <= path.length; i++) {
      const segment = path.slice(0, i).join("/");
      if (segment.length > 0 && !existsSync(segment)) {
         mkdirSync(segment);
      }
   }
}
