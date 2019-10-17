import { PluginFactory } from "@krobkrong/resources-utilities";
import { resolve } from "path";
import webpack from "webpack";

const pluginSvg = PluginFactory.getPlugins({
    cleanSvgPresentationAttr: true,
    glob: `${__dirname}/resources/icons/*.svg`,
    merge: [`${__dirname}/resources/icons/`],
    output: `${__dirname}/src/@types`,
});

const pluginCss = PluginFactory.getPlugins({
    glob: `${__dirname}/resources/styles/*.{css,scss,sass}`,
    merge: [`${__dirname}/resources/styles/`],
    output: `${__dirname}/src/@types`,
});

const config: webpack.Configuration = {
    devServer: {
        contentBase: "./dist",
        port: 8083,
    },
    entry: "./src/index-merge.ts",
    mode: "development",
    module: {
        rules: [
            {
                exclude: [
                    /node_modules|\.res\.ts$|\.d\.ts$/,
                    `${__dirname}/src/index.ts`,
                ],
                test: /\.ts$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.merge.json",
                    },
                }],
            },
        ],
    },
    output: {
        filename: "main.js",
        path: resolve(__dirname, "dist"),
    },
    plugins: [pluginSvg, pluginCss],
    resolve: {
        alias: {
            "@app/resources/icons": resolve(__dirname, `resources/icons`),
            "@app/resources/styles": resolve(__dirname, `resources/styles`),
            // tslint:disable-next-line: object-literal-sort-keys
            "@app": resolve(__dirname, "src"),
        },
        extensions: [".js", ".ts", ".css", ".sass", ".scss", ".svg"],
        plugins: [pluginSvg, pluginCss],
    },
};

export default config;
