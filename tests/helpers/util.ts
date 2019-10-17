import { ISvgMetadata } from "@resmod/vector/svg";
import { existsSync, lstatSync, PathLike, readdirSync, rmdirSync, unlinkSync } from "fs";

/**
 * provide utilities function as helper during test phase.
 */
export class Utils {
    /**
     * Sleep a fashion to let current execution wait for some amount of time
     * before it continue executed.
     * @param ms time in millisecond
     */
    public static sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * generate random name
     * @param length length of random string
     * @param includeTime true if time in millisecond is also included otherwise on random string would return.
     */
    public static randomName(length: number, includeTime: boolean = true): string {
        let result = "";
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const chLen = chars.length;
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chLen));
        }
        return includeTime ? `${result}${new Date().getTime()}` : result;
    }

    /**
     * Remove directory recursively
     * @param dir directory to be removed
     */
    public static removeDir(dir: PathLike) {
        if (existsSync(dir)) {
            readdirSync(dir).forEach((file, _) => {
                const curPath = dir + "/" + file;
                if (lstatSync(curPath).isDirectory()) { // recurse
                    this.removeDir(curPath);
                } else { // delete file
                    unlinkSync(curPath);
                }
            });
            rmdirSync(dir);
        }
    }

    /**
     * Compare two resource metadata throught hierarchy
     * @param rm1 first resource metadata to be used to compare
     * @param rm2 second resource metadata to be used to compare
     */
    public static IsResourceMetadataEqual(rm1: ISvgMetadata, rm2: ISvgMetadata, excludeId: boolean = false): boolean {
        const debug = (msg: string) => { throw new Error(msg); };
        if (rm1.name !== rm2.name) { debug(`resource different name ${rm1.name} !== ${rm2.name}`); return false; }
        const keys1 = Object.keys(rm1);
        const keys2 = Object.keys(rm2);

        if (excludeId) {
            const index1 = keys1.indexOf("id"); if (index1 >= 0) { keys1.splice(index1, 1); }
            const index2 = keys2.indexOf("id"); if (index2 >= 0) { keys2.splice(index2, 1); }
        }

        if (keys1.length !== keys2.length) {
            const rm1Key = keys1.join(",");
            const rm2Key = keys2.join(",");
            debug(`resource different attr ${keys1.length} (${rm1Key}) vs ${keys2.length} (${rm2Key})`);
            return false;
        }

        for (const key of keys1) {
            if (key === "raw" || key === "name" ||
                key === "elementType" || key === "ctext" || key === "childs") { continue; }
            if (keys2.indexOf(key) < 0) { debug(`key ${key} did not existed on both side`); return false; }
            if (rm1[key] !== rm2[key]) { debug(`key value not matched ${rm1[key]} !== ${rm2[key]}`); return false; }
            // all keys is good fit
        }

        if ((rm1.childs === undefined || rm1.childs === null) &&
            (rm2.childs === undefined || rm2.childs === null)) { return true; }
        if (rm1.childs!.length !== rm2.childs!.length) {
            debug(`child size not matched ${rm1.childs!.length} !== ${rm2.childs!.length}`); return false;
        }
        // IMPORTANT: child can be different order, relied on parser and
        // serialize build in to ensure order is consistent
        for (let i = 0; i < rm1.childs!.length; i++) {
            return this.IsResourceMetadataEqual(rm1.childs![i], rm2.childs![i], excludeId);
        }
        return true;
    }
}
