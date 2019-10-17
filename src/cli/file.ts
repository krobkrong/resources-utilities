import { DTSGenerator, IGeneratedResult } from "@resmod/cli/generator";
import { transformFileNameConvention } from "@resmod/common/convension";
import { IResourceModule } from "@resmod/webpack/loader/types";
import { parse } from "path";

/**
 * A class that implement typescript definition generator. It provide a method to generate
 * typescript definition from the file name rather than from the content of each resource.
 * This generator is being used with command line options wrap.
 */
export class FileDtsGenerator extends DTSGenerator {

    public filename(file: string): void {
        if (!this.inTransaction()) {
            throw new Error("Generator design to be use with merge option. Must call begin method first.");
        }
        const pp = parse(file);
        const rmod = {} as IResourceModule;
        rmod[transformFileNameConvention(pp.name, this.options.convension)] = "string";
        this.setResourceModule(rmod);
    }

    // @ts-ignore
    public doGenerate(raw: string, secondaryId: string, useSecondary?: boolean): IGeneratedResult | undefined {
        throw new Error("Method not implemented.");
    }

}
