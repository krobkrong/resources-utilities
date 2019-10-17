import { existsSync, unlinkSync } from "fs";
import MemoryFileSystem from "memory-fs";
import path from "path";
import webpack, { ResolvePlugin } from "webpack";

afterAll(() => {
   const file = `${__dirname}/bundle.js`;
   if (existsSync(file)) { unlinkSync(file); }
});

export class WebpackUtil {

   public static run(
      entry: string,
      rules: webpack.RuleSetRule[],
      plugins?: webpack.Plugin[],
      resolvePlugins?: ResolvePlugin[]): Promise<webpack.Stats> {
      const compiler = webpack({
         context: path.resolve(__dirname, "../../"),
         entry,
         mode: "development",
         module: {
            rules,
         },
         output: {
            filename: "bundle.js",
            path: path.resolve(__dirname),
         },
         plugins,
         resolve: {
            alias: {
               "@simple1": "src",
            },
            extensions: [".ts", ".js", ".css", ".sass", ".scss", ".svg"],
            plugins: resolvePlugins,
         },
      });

      compiler.outputFileSystem = new MemoryFileSystem();

      return new Promise<webpack.Stats>((resolve, reject) => {
         compiler.run((err, stats) => {
            if (err) { reject(err); }
            if (stats.hasErrors()) { reject(new Error(stats.toJson().errors.join("\n"))); }

            resolve(stats);
         });
      });
   }

}
