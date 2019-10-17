import { alphabetCharacterName, RawValue } from "@resmod/common/convension";
import { Selector } from "@resmod/common/selector";
import { IVectorParseOptions } from "@resmod/vector/parser";
import { IElementParsingMeta, IPrefix, ISvgMetadata, prefix } from "@resmod/vector/svg";
import { VectorElementType, VectorType } from "@resmod/vector/types";
import { IResourceModule } from "@resmod/webpack/loader/types";

/** a class that only parse attribute of each tag of svg element */
export class AttributeParser {

    private attr: RawValue;
    private val: RawValue;
    private transVal: Selector;

    private namePrefix?: IPrefix;
    private convensionCb?: (name: string) => string;
    private prefixCb?: (vector: VectorType, element: VectorElementType) => string;

    /**
     * Create attribute parser
     * @param options vector parse options
     */
    constructor(options: IVectorParseOptions) {
        this.attr = new RawValue(alphabetCharacterName);
        this.val = new RawValue();
        this.transVal = new Selector(options.convensionCb ? undefined : options.convension, options.prefix);
        this.convensionCb = options.convensionCb;
        if (options.prefix) {
            if (options.prefixCb) {
                this.prefixCb = options.prefixCb;
            } else {
                this.namePrefix = prefix(options!.convension!);
            }
        }
    }

    /**
     * Parse the attribute from the given raw svg vector
     * @param raw a raw svg vector
     * @param index the started index
     * @param validAttr an index attribute describe the valid attribute to include into resource module
     * @param resMod a resource module object
     * @param svgMeta an svg metadata
     */
    public parseAttribute(
        raw: string,
        index: number,
        validElement: IElementParsingMeta | undefined,
        resMod: IResourceModule | undefined,
        svgMeta: ISvgMetadata): number {

        let ch = 0;
        let openCh = 0;
        this.attr.reset();
        this.val.reset();
        this.transVal.reset();

        for (; index < raw.length; index++) {
            ch = raw.charCodeAt(index);

            switch (ch) {
                case 10:    // new line
                case 32:    // space consider the end
                case 9:     // tab consider the end
                    if (!this.attr.isLocked() && this.attr.toString().length > 0) {
                        this.attr.lock();
                    }
                    if (openCh === 0) {
                        continue;
                    } else {
                        this.val.append(ch);
                        this.transVal.append(ch);
                    }

                case 61:    // = end of attribute
                    this.attr.lock();
                    continue;

                case 34:    // " start or end id value
                case 39:    // ' start or end id value
                    if (openCh > 0 && openCh === ch) {
                        // the end of value
                        const elAttr = this.attr.toString();
                        svgMeta[elAttr] = this.val.toString();
                        if (validElement && validElement.attr[elAttr]) {
                            let tval = this.transVal.toString();
                            if (this.convensionCb) {
                                tval = this.convensionCb(tval);
                            }
                            if (this.prefixCb) {
                                tval = `${this.prefixCb(VectorType.SVG, svgMeta.elementType)}${tval}`;
                            } else if (this.namePrefix) {
                                tval = `${this.namePrefix[svgMeta.elementType]}${tval}`;
                            }
                            if (resMod) {
                                resMod[tval] = this.val.toString();
                            }
                        }
                        this.reset();
                        openCh = 0;
                    } else {
                        openCh = ch;
                    }
                    continue;

                case 62:    // > the end of element
                case 47:    // / trailer slash
                    if (openCh === 0) {
                        // the end of element
                        return index - 1;
                    }

                default:
                    if (openCh > 0) {
                        this.val.append(ch);
                        if (validElement && validElement.attr[this.attr.toString()]) {
                            this.transVal.append(ch);
                        }
                    } else {
                        this.attr.append(ch);
                    }

            }
        }
        throw new Error("unexpected error");
    }

    /**
     * reset the state of attribute tracing to it initial state.
     */
    public reset() {
        this.attr.reset();
        this.val.reset();
        this.transVal.reset();
    }

}
