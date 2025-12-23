const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

/**
 * Webpack Configuration
 * Soporta modo desarrollo y producción mediante:
 *   - npm run start (desarrollo con dev-server)
 *   - npm run build (desarrollo)
 *   - npm run build:prod (producción)
 */
module.exports = (env, argv) => {
  // Detectar modo: producción o desarrollo
  const isProduction = argv.mode === "production";
  
  console.log(`\n🔧 Webpack Mode: ${isProduction ? "PRODUCTION" : "DEVELOPMENT"}\n`);

  // Configuración base compartida
  const config = {
    mode: isProduction ? "production" : "development",
    entry: path.resolve(__dirname, "src", "index.js"),
    
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "src", "index.html"),
        // Minificar HTML en producción
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
        } : false,
      }),
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      }),
      // Definir variable de entorno para el código cliente
      new webpack.DefinePlugin({
        "process.env.NODE_ENV": JSON.stringify(isProduction ? "production" : "development"),
      }),
      // Plugin para copiar archivos PWA
      new CopyWebpackPlugin({
        patterns: [
          { from: "public/manifest.json", to: "manifest.json" },
          { from: "public/service-worker.js", to: "service-worker.js" },
          { from: "public/browserconfig.xml", to: "browserconfig.xml" },
          { from: "public/icons", to: "icons" },
          { from: "public/favicon.png", to: "favicon.png", noErrorOnMissing: true },
          { from: "public/stoarage", to: "TNSTrack", noErrorOnMissing: true },
        ],
      }),
    ],

    // Source maps: completos en desarrollo, ocultos o ninguno en producción
    devtool: isProduction ? false : "source-map",

    output: {
      path: path.resolve(__dirname, "public"),
      // Cache busting con hash en producción
      filename: isProduction ? "bundle.[contenthash].js" : "bundle.js",
      publicPath: "/TNSTrack/",
      // NO usar clean porque output y archivos fuente PWA están en la misma carpeta
      // La limpieza de bundles antiguos se hace con: npm run clean
    },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: ["style-loader", "css-loader", "postcss-loader"],
        },
        {
          test: /\.css$/,
          include: /node_modules/,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: "asset/resource",
        },
      ],
    },

    resolve: {
      extensions: [".js", ".jsx"],
      fallback: {
        buffer: require.resolve("buffer/"),
        crypto: require.resolve("crypto-browserify"),
        vm: require.resolve("vm-browserify"),
        stream: require.resolve("stream-browserify"),
        util: require.resolve("util/"),
      },
      alias: {
        "process/browser": require.resolve("process/browser"),
        "@": path.resolve(__dirname, "src"),
      },
    },

    // Optimizaciones específicas de producción
    optimization: isProduction ? {
      minimize: true,
      splitChunks: {
        chunks: "all",
        name: false,
      },
    } : {},

    // Performance hints solo en producción
    performance: isProduction ? {
      hints: "warning",
      maxAssetSize: 512000, // 500 KB
      maxEntrypointSize: 512000,
    } : false,
  };

  // DevServer: solo se usa en desarrollo (webpack serve)
  // Se incluye siempre pero webpack lo ignora en modo build
  if (!isProduction) {
    config.devServer = {
      static: {
        directory: path.join(__dirname, "public"),
        publicPath: "/TNSTrack/",
      },
      compress: true,
      port: 3000,
      host: "0.0.0.0",
      allowedHosts: "all", // Permitir ngrok y otros hosts externos en desarrollo
      historyApiFallback: {
        index: "index.html",
        rewrites: [
          { from: /^\/TNSTrack\/bundle.js$/, to: "/bundle.js" },
          { from: /^\/reset-password\/([a-z0-9]+)$/, to: "/TNSTrack/index.html" },
          { from: /./, to: "/TNSTrack/index.html" },
        ],
      },
      proxy: [
        {
          context: ["/api"],
          target: "http://localhost:1337",
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: "localhost",
          cookiePathRewrite: "/",
          logLevel: "debug",
          onProxyReq: (proxyReq, req, res) => {
            console.log("[Proxy] →", req.method, req.url, "→ http://localhost:1337" + req.url);
          },
          onProxyRes: (proxyRes, req, res) => {
            console.log("[Proxy] ←", proxyRes.statusCode, req.url);
          },
        },
      ],
    };
  }

  return config;
};
