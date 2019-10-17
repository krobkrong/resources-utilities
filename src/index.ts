
export {
   VectorType,
   SvgElementType,
   VectorElementType,
} from "@resmod/vector/types";

export {
   VectorUtils,
   IVectorParser as VectorParser,
   IVectorParseOptions as VectorParseOptions,
} from "@resmod/vector/parser";

export {
   ISvgMetadata as SvgMetadata,
   SvgModuleParser,
} from "@resmod/vector/svg";

export {
   StyleType,
   CssSelectorType,
} from "@resmod/style/types";

export {
   StyleUtils,
   IStyleParser as StyleParser,
   ICssParseOptions as CssParseOptions,
} from "@resmod/style/parser";

export {
   CssModuleParser,
} from "@resmod/style/modular";

export {
   NameConvension,
} from "@resmod/common/convension";

export {
   IResources as Resources,
   IResourceModule as ResourceModule,
   IResourceMetadata as ResourceMetadata,
   SerializeResourceModule,
} from "@resmod/webpack/loader/types";

export {
   IDtsGeneratorOptions as DtsGeneratorOptions,
   PluginFactory,
} from "@resmod/webpack/plugins/factory";

export {
   IGeneratedMetadata as GeneratedMetadata,
   WebpackResourcePlugin,
} from "@resmod/webpack/plugins/plugin";

export {
   IDTSMeta as DTSMeta,
   DTSGenerator,
} from "@resmod/cli/generator";

export {
   Generate,
   ICommandLineOptions as CommandLineOptions,
} from "@resmod/cli/dts";

export {
   CssDTSGenerator,
} from "@resmod/cli/css";

export {
   SvgDTSGenerator,
} from "@resmod/cli/svg";
