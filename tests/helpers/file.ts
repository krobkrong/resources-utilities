import { Utils } from "./helper";
import { existsSync, unlinkSync, writeFileSync, statSync } from "fs";

/**
 * class helper provide away to generate linking js and resource file.
 */
export class FileGenHelper {

   private rootDir: string
   private files: string[]
   private index: string
   private css: boolean

   constructor(rootDir: string, genCss: boolean, numFile: number) {
      this.rootDir = rootDir
      this.css = genCss
      this.files = []
      for (let i = 0; i < numFile; i++) {
         this.files.push(Utils.randomName(5))
      }
      this.index = `${this.rootDir}/${Utils.randomName(5)}.js`
   }

   /** remove file if existed */
   private removeFile(filename: string) {
      if (existsSync(filename)) unlinkSync(filename)
   }

   /** cleanup remove all generated file */
   public cleanup() {
      this.files.forEach(name => {
         this.css ?
            this.removeFile(`${this.rootDir}/${name}.css`) :
            this.removeFile(`${this.rootDir}/${name}.svg`)

         this.removeFile(`${this.rootDir}/${name}.d.ts`)
      })
      this.removeFile(this.index)
   }

   /** reset generated file content to empty and remove .d.ts file */
   public reset() {
      this.files.forEach(name => {
         this.css ?
            writeFileSync(`${this.rootDir}/${name}.css`, "") :
            writeFileSync(`${this.rootDir}/${name}.svg`, "")

         this.removeFile(`${this.rootDir}/${name}.d.ts`)
      })
   }

   /** write content into file */
   public write(i: number, content: string) {
      writeFileSync(this.getFile(i), content)
   }

   /** return number of file generated */
   public size(): number {
      return this.files.length;
   }

   /** return current modified date of a file */
   public fileModified(i: number): number {
      return statSync(this.getFile(i)).mtime.getTime()
   }

   /** return all modified time of all generated file  */
   public filesModified(): number[] {
      let mt: number[] = []
      this.files.forEach((_, i) => {
         existsSync(this.getFile(i)) ? mt.push(this.fileModified(i)) : mt.push(0)
      })
      return mt
   }

   /** return current modified date of definition files */
   public fileDtsModified(i: number): number {
      return statSync(this.getDtsFile(i)).mtime.getTime()
   }

   /** return all modified time of all definition file */
   public filesDtsModified(): number[] {
      let mt: number[] = []
      this.files.forEach((_, i) => {
         existsSync(this.getDtsFile(i)) ? mt.push(this.fileDtsModified(i)) : mt.push(0)
      })
      return mt
   }

   /** generate index file */
   public computeIndex() {
      let content = ""
      let bodyCode = ""
      let ext = this.css ? ".css" : ".svg"
      this.files.forEach((name, index) => {
         content += `import runtime${index} from "./${name}${ext}"\n`
         bodyCode += `\${runtime${index}} `
      })
      content += `export function test() { return \`${bodyCode}\` }`
      writeFileSync(this.index, content)
   }

   /** return the generated index file */
   public getIndexFile(): string { return this.index }

   /** return absolute path to the generated css or svg file */
   public getFile(i: number): string { return `${this.rootDir}/${this.files[i]}${this.css ? ".css" : ".svg"}` }

   /** return definition file which generate along side resource file */
   public getDtsFile(i: number): string { return `${this.rootDir}/${this.files[i]}.d.ts` }

   /** return relative path to the generated css or svg file */
   public getRelativeFile(i: number): string { return `${this.files[i]}${this.css ? ".css" : ".svg"}` }

}