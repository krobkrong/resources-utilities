import path from 'path';
import webpack, { ResolvePlugin } from 'webpack';
import { unlinkSync, existsSync } from 'fs';
import MemoryFileSystem from 'memory-fs';

afterAll(() => {
   let file = `${__dirname}/bundle.js`
   if (existsSync(file)) unlinkSync(file)
})

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
            extensions: ['.ts', '.js', '.css', '.sass', '.scss', '.svg'],
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

      compiler.outputFileSystem = new MemoryFileSystem()

      return new Promise<webpack.Stats>((resolve, reject) => {
         compiler.run((err, stats) => {
            if (err) reject(err);
            if (stats.hasErrors()) reject(new Error(stats.toJson().errors.join("\n")));

            resolve(stats);
         });
      });
   };

}
