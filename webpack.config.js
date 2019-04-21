'use strict';

module.exports = {
  devtool: 'inline-source-map',
  devServer: {
    publicPath: "/dist/"
  },
  entry: [
    './src/index.ts',
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  }
};
