/** @type {import('next').NextConfig} */
// Import next-pwa dynamically to avoid ESLint error
const withPWA = (() => {
  try {
    return require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
    })
  } catch (e) {
    return (config) => config
  }
})()

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
    // Disable strict mode for rules to allow more flexible code patterns
    dirs: ['pages', 'components', 'lib', 'utils', 'hooks', 'app', 'config'],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    // Correctly configure turbo as an object
    turbo: {
      rules: {
        // Specify which directories should be processed by turbo
        '*.{js,ts,jsx,tsx}': {
          loaders: ['@swc/core'],
        },
      },
    },
  },
  // 为Mastra配置服务器外部包
  serverExternalPackages: ["@mastra/*"],
  
  // 处理客户端缺少的Node.js模块
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 在客户端构建中提供空模块
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "worker_threads": false,
        "fs": false,
        "path": false,
        "os": false,
      }
    }
    
    // 配置SDK相对路径解析
    config.resolve.alias = {
      ...config.resolve.alias,
      '@sdk': path.resolve(__dirname, '../clients/ts/src'),
    };
    
    // 添加MiniCssExtractPlugin插件
    config.plugins.push(
      new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
        chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
      })
    );
    
    return config
  },
}

module.exports = withPWA(nextConfig)
