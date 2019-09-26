const path = require('path');
const aa = require('@krobkrong/resources-utilities');

let pluginSvg = aa.PluginFactory.getPlugins({
    glob: `${__dirname}/resources/icons/*.svg`,
    output: `${__dirname}/src/@types`
})

let pluginCss = aa.PluginFactory.getPlugins({
    glob: `${__dirname}/resources/styles/*.{css,scss,sass}`,
    output: `${__dirname}/src/@types`
})


module.exports = {
    mode: 'development',
    entry: './src/index.js',
    resolve: {
        extensions: ['.js', '.css', '.sass', '.scss', '.svg'],
        plugins: [pluginSvg, pluginCss],
    },
    plugins: [pluginSvg, pluginCss],
    devServer: {
        contentBase: './dist',
        port: 8080
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist')
    }
};