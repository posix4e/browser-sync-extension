const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/common/background.ts',
    popup: './src/common/popup.ts',
    options: './src/common/options.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@common': path.resolve(__dirname, 'src/common'),
    },
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './src/common/popup.html', to: 'popup.html' },
        { from: './src/common/options.html', to: 'options.html' },
      ],
    }),
  ],
};