const webpack = require('webpack');
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        main: './src/mount.js',
        autumn: './src/themes/autumn/autumn.scss',
    },
    mode: 'development',
    output: {
        path: path.resolve(__dirname, 'public/dist'),
        filename: '[name].bundle.js',
    },
    // optimization: {
    //     splitChunks: {
    //         cacheGroups: {
    //             styles: {
    //                 name: 'theme',
    //                 test: /\.s[ac]ss$/i,
    //                 chunks: 'all',
    //                 enforce: true,
    //             },
    //         },
    //     },
    // },
    resolve: {
        fallback: { path: require.resolve('path-browserify'), process: false },
    },
    plugins: [
        //new CleanWebpackPlugin(),
        new webpack.DefinePlugin({
            CURRENT_VERSION: JSON.stringify(process.env.npm_package_version),
        }),
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: '[name].bundle.css',
        }),
    ],
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules\/(?!tributejs)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            publicPath: '',
                        },
                    },
                    // Translates CSS into CommonJS
                    'css-loader',
                    // Compiles Sass to CSS
                    'sass-loader',
                ],
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
                use: ['file-loader'],
            },
        ],
    },
};
