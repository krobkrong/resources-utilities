/**
 * Convension name typed.
 */
export type NameConvension = "camel" | "snake" | "pascal" | "Snake";

/**
 * Trace's tracing the scanned character and provide necessary data
 * to decide whether the current character should transform to lowercase
 * or uppercase.
 */
export interface ITrace {
   index: number;
   seg: number;
   // use with camel case only
   hyphen?: boolean;
}

/**
 * A function that transfrom the given ascii code ch character into string.
 * If the numeric is true then the given ascii code of number 0 to 9 will convert
 * into string otherwise an exception is raised.
 */
export type TransformCharacter = (ch: number, numeric?: boolean) => string;

/**
 * Tranfrom the given ascii code into lowercase character if it's not yet a lowercase string.
 * @param ch ascii character code
 * @param numeric an optional state indicate whether or not to include numeric conversion
 */
export function lowercaseCharacterName(ch: number, numeric?: boolean): string {
   if (64 < ch && ch < 91) { // A-Z
      return String.fromCharCode(ch + 32);
   } else if ((96 < ch && ch < 123) || ch === 45 || (numeric && 47 < ch && ch < 58)) { // // a-z & - (hyphen)
      return String.fromCharCode(ch);
   }
   throw new Error("invalid resource name character expected characters of a-z, A-Z or" +
      `hyphen (-) got ${String.fromCharCode(ch)}`);
}

/**
 * Transform the given ascii code into uppercase character if it's not yet an uppercase string.
 * @param ch ascii character code
 * @param numeric an optional state indicate whether or not to include numeric conversion
 */
export function uppercaseCharacterName(ch: number, numeric?: boolean): string {
   if ((64 < ch && ch < 91) || ch === 45 || (numeric && 47 < ch && ch < 58)) { // A-Z & - (hyphen)
      return String.fromCharCode(ch);
   } else if (96 < ch && ch < 123) { // a-z
      return String.fromCharCode(ch - 32);
   }
   throw new Error(" invalid resource name character expected characters of a-z, A-Z or hyphen (-) got " +
      String.fromCharCode(ch));
}

/**
 * Transform ascii character code into string. The function accept only
 * character a to z for both lower and upper case including hyphen.
 * @param ch ascii character code
 */
export function alphabetCharacterName(ch: number): string {
   if ((40 < ch && ch < 91) || (96 < ch && ch < 123)) { // A-Z
      return String.fromCharCode(ch);
   }
   throw new Error("invalid resource name character");
}

/**
 * Convension function type that transform the given ch character code into
 * a string. The returned string will reflect to the type `NameConvension`.
 */
export type Convension = (ch: number, trace: ITrace) => string;

/**
 * return a Convension function that transform a single character based on given convension.
 * The Convension function only work with css selector keyword syntax such as id, class or css-variable.
 * @param convension a name convension. e.g camel
 * @param hasPrefix indicate whether the transfrom does indeed including a prefix.
 */
export function transformCssSelectorKey(convension: NameConvension, hasPrefix: boolean): Convension {
   switch (convension) {
      case "Snake":
         return (ch: number, trace: ITrace): string => {
            if (96 < ch && ch < 123) {
               ch -= 32;
               trace.index++;
            } else if (ch === 45) {
               ch = 95;
               trace.index = 0;
               trace.seg++;
            }
            return String.fromCharCode(ch);
         };

      case "snake":
         return (ch: number, trace: ITrace): string => {
            if (64 < ch && ch < 91) {
               ch += 32;
               trace.index++;
            } else if (ch === 45) {
               ch = 95;
               trace.index = 0;
               trace.seg++;
            }
            return String.fromCharCode(ch);
         };
      default:
         if (convension === "pascal" || (convension === "camel" && hasPrefix)) {
            return (ch: number, trace: ITrace): string => {
               if (ch === 45) {
                  if (!trace.hyphen) {
                     trace.hyphen = true;
                     trace.index = 0;
                     trace.seg++;
                     return "";
                  } else {
                     return "_";
                  }
               } else if (64 < ch && ch < 91 && trace.index > 0) {
                  ch += 32;
               } else if (96 < ch && ch < 123 && trace.index === 0) {
                  ch -= 32;
               }
               trace.index++;
               trace.hyphen = false;
               return String.fromCharCode(ch);
            };
         }
         // else is camel case
         return (ch: number, trace: ITrace): string => {
            if (ch === 45) {
               if (!trace.hyphen) {
                  trace.hyphen = true;
                  trace.index = 0;
                  trace.seg++;
                  return "";
               } else {
                  return "_";
               }
            } else if (64 < ch && ch < 91 && (trace.index > 0 || (trace.index === 0 && trace.seg === 0))) {
               ch += 32;
            } else if (96 < ch && ch < 123 && trace.index === 0 && trace.seg > 0) {
               ch -= 32;
            }
            trace.index++;
            trace.hyphen = false;
            return String.fromCharCode(ch);
         };
   }
}

/**
 * A class that consume ascii character code and compute string from it.
 */
export class RawValue {

   private raw!: string;
   private name!: string;
   private tc?: TransformCharacter;

   private isLock: boolean = false;

   /**
    * Create RawValue
    * @param tc an optional transformation character
    */
   constructor(tc?: TransformCharacter) {
      this.tc = tc;
      this.reset();
   }

   /**
    * append a character to the raw data
    * @param ch ascii character code
    */
   public append(ch: number): this {
      if (this.isLock) { throw new Error("invalid operation, raw value is locked"); }

      if (this.tc) {
         this.name += this.tc(ch);
         this.raw += String.fromCharCode(ch);
      } else {
         this.name += String.fromCharCode(ch);
         this.raw = this.name;
      }
      return this;
   }

   /**
    * Reset all recorded data to initial state with empty string and
    * mark the record as unlock to allow a call to `append` method.
    */
   public reset(): void {
      this.name = "";
      this.raw = "";
      this.isLock = false;
   }

   /**
    * lock disable raw value from accept any append method. Calling append after
    * raw value is locked result an exception `invalid operation, raw value is locked` raised.
    */
   public lock(): void {
      this.isLock = true;
   }

   /**
    * check whether the raw value is locked
    */
   public isLocked(): boolean {
      return this.isLock;
   }

   /**
    * return a string that concatinate by append method.
    */
   public toString(): string {
      return this.name;
   }

   /**
    * return true if there is not tag being traced
    */
   public isEmpty(): boolean {
      return this.name.length === 0;
   }

   /**
    * return a raw string than a transform version. If the transform character is
    * not given then `rawString` will return the same value as `toString`
    */
   public rawString(): string {
      return this.raw;
   }

}

/**
 * Transform file name based on the given name convension.
 * @param name name of the file
 * @param convension name convension
 */
export function transformFileNameConvention(name: string, convension: NameConvension): string {
   let replace: string = "";
   let transformCharacter = lowercaseCharacterName;
   switch (convension) {
      case "Snake":
         replace = "_";
         transformCharacter = uppercaseCharacterName;
         break;

      case "snake":
         replace = "_";
         break;
   }

   let tranName = "";
   for (let i = 0; i < name.length; i++) {
      const ch = name.charCodeAt(i);
      switch (ch) {
         case 46: // . (dot)
         case 45: // - (hyphen)
            tranName += replace;
            if (replace.length === 0) {
               i++;
               tranName += uppercaseCharacterName(name.charCodeAt(i), true);
            }
            continue;

         case 95: // _ (underscore)
            if (replace.length === 0) {
               i++;
               tranName += uppercaseCharacterName(name.charCodeAt(i), true);
            } else {
               tranName += String.fromCharCode(ch);
            }
            continue;

         default:
            if (replace.length === 0 && i === 0 && convension === "pascal") {
               tranName += uppercaseCharacterName(ch, true);
            } else {
               tranName += transformCharacter(ch, true);
            }
      }
   }

   return tranName;
}
