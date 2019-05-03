import { existsSync, mkdirSync } from "fs";

export function mkdirSyncRecursive(dir: string) {
   var path = dir.replace(/\/$/, '').split('/');
   for (var i = 1; i <= path.length; i++) {
      var segment = path.slice(0, i).join('/');
      segment.length > 0 && !existsSync(segment) ? mkdirSync(segment) : null;
   }
}