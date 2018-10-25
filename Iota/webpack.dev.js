'use strict'
const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const htmlWebpackPlugin   = require('html-webpack-plugin');

const PUBLIC_DIR = path.resolve(__dirname);

module.exports = {
  mode: 'development',
  entry: [
    './index.js'
  ],
  output: {
    filename: 'bundle.js',
    path: PUBLIC_DIR,
  },
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    compress: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    alias: {
      'vue$': 'vue/dist/vue.esm.js'
    }
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
            'scss': 'vue-style-loader!css-loader!sass-loader',
            'sass': 'vue-style-loader!css-loader!sass-loader?indentedSyntax'
          }
        }
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
          {
            loader: 'awesome-typescript-loader',
            options: {
              configFile: 'tsconfig.json',
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader'
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true
            }
          },
          {
            loader: 'sass-bulk-import-loader',
          }
        ]
      },
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new htmlWebpackPlugin({
      template: './index.html',
    }),
  ],
};
