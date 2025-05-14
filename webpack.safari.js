const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  output: {
    path: path.resolve(__dirname, 'dist/safari'),
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: './src/safari/manifest.json', 
          to: 'manifest.json',
          force: true
        },
      ],
    }),
  ],
});