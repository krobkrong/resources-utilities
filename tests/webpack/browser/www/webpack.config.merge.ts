import webpack from 'webpack'
import { resolve } from "path"
import { PluginFactory } from '@krobkrong/resources-utilities'

let pluginSvg = PluginFactory.getPlugins({
    glob: `${__dirname}/resources/icons/*.svg`,
    merge: [`${__dirname}/resources/icons/`],
    output: `${__dirname}/src/@types`
})

let pluginCss = PluginFactory.getPlugins({
    glob: `${__dirname}/resources/styles/*.{css,scss,sass}`,
    merge: [`${__dirname}/resources/styles/`],
    output: `${__dirname}/src/@types`
})

const config: webpack.Configuration = {
    mode: 'development',
    entry: './src/index-merge.ts',
    resolve: {
        extensions: ['.js', '.ts', '.css', '.sass', '.scss', '.svg'],
        alias: {
            "@app/resources/icons": resolve(__dirname, `resources/icons`),
            "@app/resources/styles": resolve(__dirname, `resources/styles`),
            "@app": resolve(__dirname, "src")
        },
        plugins: [pluginSvg, pluginCss],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        configFile: "tsconfig.merge.json"
                    }
                }],
                exclude: [
                    /node_modules|\.res\.ts$|\.d\.ts$/,
                    `${__dirname}/src/index.ts`
                ]
            }
        ]
    },
    plugins: [pluginSvg, pluginCss],
    devServer: {
        contentBase: './dist',
        port: 8083
    },
    output: {
        filename: 'main.js',
        path: resolve(__dirname, 'dist')
    }
};

export default config