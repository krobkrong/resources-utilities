import { Convension, ITrace, NameConvension, transformCssSelectorKey } from "@resmod/common/convension";

/**
 * A class that consume a valid css selector character code and compute string from it.
 */
export class Selector {

    private value!: string;
    private rawValue!: string;
    private cs?: Convension;
    private trace?: ITrace;

    /**
     * Create selector class
     * @param cs name convension
     * @param prefix indicate whether the value is indeed has prefix
     */
    constructor(cs?: NameConvension, prefix: boolean = false) {
        if (cs) {
            this.cs = transformCssSelectorKey(cs!, prefix);
            this.trace = { index: 0, seg: 0 };
        }
        this.reset();
    }

    /**
     * append `ch` into raw data and well as transfromed data
     * @param ch ascii character code
     */
    public append(ch: number): this {
        this.rawValue += String.fromCharCode(ch);
        if (this.cs) {
            this.value += this.cs(ch, this.trace!);
        } else {
            this.value += String.fromCharCode(ch);
        }
        return this;
    }

    /**
     * append `ch` into raw data only
     * @param ch ascii character code
     */
    public appendRaw(ch: number): this {
        this.rawValue += String.fromCharCode(ch);
        return this;
    }

    /**
     * reset both raw data and transform data into initilize state with
     * an empty string.
     */
    public reset(): void {
        this.value = "";
        this.rawValue = "";
        if (this.trace) {
            this.trace.index = 0, this.trace.seg = 0, this.trace.hyphen = false;
        }
    }

    /**
     * return tranformed string
     */
    public toString(): string {
        return this.value;
    }

    /**
     * return raw string
     */
    public rawString(): string {
        return this.rawValue;
    }

}
