import path from 'path';
import webpack, { ResolvePlugin } from 'webpack';
import { unlinkSync, existsSync } from 'fs';

afterAll(() => {
   let file = `${__dirname}/bundle.js`
   if (existsSync(file)) unlinkSync(file)
})

export interface PromiseWatching {
   watching: webpack.Watching
}

export namespace WebpackUtil {

   export function run(entry: string, rules: webpack.RuleSetRule[], plugins?: webpack.Plugin[], resolvePlugins?: ResolvePlugin[]): Promise<webpack.Stats> {
      const compiler = webpack({
         context: path.resolve(__dirname, "../../"),
         entry: entry,
         mode: "development",
         output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js',
         },
         resolve: {
            extensions: [".js"],
            plugins: resolvePlugins,
            alias: {
               "@simple1": "src"
            }
         },
         module: {
            rules: rules
         },
         plugins: plugins,
      });

      return new Promise<webpack.Stats>((resolve, reject) => {
         compiler.run((err, stats) => {
            if (err) reject(err);
            if (stats.hasErrors()) reject(new Error(stats.toJson().errors.join("\n")));

            resolve(stats);
         });
      });
   };

   export function watch(entry: string, rules: webpack.RuleSetRule[], pw: PromiseWatching, plugins?: webpack.Plugin[], resolvePlugins?: ResolvePlugin[]): Promise<webpack.Stats> {
      const compiler = webpack({
         context: path.resolve(__dirname, "../../"),
         entry: entry,
         watch: true,
         mode: "development",
         output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js',
         },
         resolve: {
            extensions: [".js"],
            plugins: resolvePlugins,
         },
         module: {
            rules: rules
         },
         plugins: plugins,
      });

      return new Promise<webpack.Stats>((resolve, reject) => {
         pw.watching = compiler.watch({ aggregateTimeout: 50 }, (err: Error, stats: webpack.Stats) => {
            if (err) reject(err);
            if (stats.hasErrors()) reject(new Error(stats.toJson().errors.join("\n")));

            resolve(stats);
         })
      });

   }

}
