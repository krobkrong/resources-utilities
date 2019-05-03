import path from 'path';
import webpack from 'webpack';
import { unlinkSync, existsSync } from 'fs';
import { DtsGeneratorPlugin, DtsGeneratedOption } from '@resmod/webpack/plugins/generator';

afterAll(() => {
   let file = `${__dirname}/bundle.js`
   if (existsSync(file)) unlinkSync(file)
})

export interface PromiseWatching {
   watching: webpack.Watching
}

export namespace WebpackUtil {

   export function run(entry: string, rules: webpack.RuleSetRule[], options: DtsGeneratedOption): Promise<webpack.Stats> {
      const compiler = webpack({
         context: path.resolve(__dirname, "../../"),
         entry: `${entry}`,
         watch: true,
         output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js',
         },
         resolve: {
            extensions: [".js"],
         },
         module: {
            rules: rules
         },
         plugins: [
            new DtsGeneratorPlugin(options),
         ]
      });

      return new Promise<webpack.Stats>((resolve, reject) => {
         compiler.run((err, stats) => {
            if (err) reject(err);
            if (stats.hasErrors()) reject(new Error(stats.toJson().errors));

            resolve(stats);
         });
      });
   };

   export function watch(entry: string, rules: webpack.RuleSetRule[], options: DtsGeneratedOption, pw: PromiseWatching): Promise<webpack.Stats> {
      const compiler = webpack({
         context: path.resolve(__dirname, "../../"),
         entry: `${entry}`,
         watch: true,
         output: {
            path: path.resolve(__dirname),
            filename: 'bundle.js',
         },
         resolve: {
            extensions: [".js"],
         },
         module: {
            rules: rules
         },
         plugins: [
            new DtsGeneratorPlugin(options)
         ]
      });

      return new Promise<webpack.Stats>((resolve, reject) => {
         pw.watching = compiler.watch({ aggregateTimeout: 50 }, (err: Error, stats: webpack.Stats) => {
            if (err) reject(err);
            if (stats.hasErrors()) reject(new Error(stats.toJson().errors));

            resolve(stats);
         })
      });

   }

}
