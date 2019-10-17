const path = require("path");
const resUtil = require("@krobkrong/resources-utilities");

const pluginSvg = resUtil.PluginFactory.getPlugins({
  glob: `${__dirname}/resources/icons/*.svg`,
  merge: [`${__dirname}/resources/icons/`],
  output: `${__dirname}/src/@types`,
  cleanSvgPresentationAttr: true
});

const pluginCss = resUtil.PluginFactory.getPlugins({
  glob: `${__dirname}/resources/styles/*.{css,scss,sass}`,
  merge: [`${__dirname}/resources/styles/`],
  output: `${__dirname}/src/@types`
});

module.exports = {
  mode: "development",
  entry: "./src/index-merge.js",
  resolve: {
    extensions: [".js", ".css", ".sass", ".scss", ".svg"],
    plugins: [pluginSvg, pluginCss]
  },
  plugins: [pluginSvg, pluginCss],
  devServer: {
    contentBase: "./dist",
    port: 8082
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist")
  }
};
