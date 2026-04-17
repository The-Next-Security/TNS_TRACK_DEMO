const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Detectar entorno leyendo connection-config.json (mismo archivo que usa el servidor)
// environment: 0 → desarrollo | environment: 1 → producción
let isProduction = false;
try {
  const connectionConfig = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "src/config/jsons/connection-config.json"), "utf8")
  );
  isProduction = connectionConfig.environment === 1;
  console.log(`[webpack] Entorno detectado: ${isProduction ? "PRODUCCIÓN" : "DESARROLLO"}`);
} catch (e) {
  console.warn("[webpack] connection-config.json no encontrado — usando modo desarrollo");
}

module.exports = {
  mode: isProduction ? "production" : "development",
  entry: path.resolve(__dirname, "src", "index.js"),
  // Suprimir warning de require() dinámico en react-datepicker (issue conocido del paquete)
  ignoreWarnings: [
    {
      module: /react-datepicker/,
      message: /Critical dependency/,
    },
  ],
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "src", "index.html"),
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
    // Limita los locales de date-fns al español — evita require() dinámico de react-datepicker
    new webpack.ContextReplacementPlugin(/date-fns\/locale/, /es/),
    // Plugin para copiar archivos PWA
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'src/service-worker.js',
          to: 'service-worker.js'
        },
        {
          from: 'public/browserconfig.xml',
          to: 'browserconfig.xml'
        },
        // Íconos iOS → icons/icon-{N}x{N}.png (cubre tamaños pequeños: 16, 32, 128, 152, etc.)
        {
          from: 'src/assets/icons/ios',
          to({ absoluteFilename }) {
            const size = path.basename(absoluteFilename, '.png');
            return `icons/icon-${size}x${size}.png`;
          },
          globOptions: {
            ignore: ['**/*.json']
          }
        },
        // Íconos Android → icons/icon-{W}x{H}.png (reemplaza iOS en tamaños compartidos: 72, 96, 144, 192, 512)
        {
          from: 'src/assets/icons/android',
          to({ absoluteFilename }) {
            const filename = path.basename(absoluteFilename);
            return `icons/${filename.replace('launchericon-', 'icon-')}`;
          },
          force: true
        },
        {
          from: 'public/favicon.png',
          to: 'favicon.png',
          noErrorOnMissing: true
        },
        {
          from: 'public/stoarage',
          to: 'TNSTrack',
          noErrorOnMissing: true
        }
      ],
    }),
  ],
  devtool: isProduction ? false : "source-map",
  output: {
    path: path.resolve(__dirname, "public"),
    filename: isProduction ? "bundle.[contenthash].js" : "bundle.js",
    publicPath: "/TNSTrack/",
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
      crypto: false, // sin polyfill — ningún componente browser usa crypto directamente
      vm: require.resolve("vm-browserify"),
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
    },
    alias: {
      "process/browser": require.resolve("process/browser"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
      publicPath: "/TNSTrack/",
    },
    compress: true,
    port: 3000,
    host: "0.0.0.0",
    //allowedHosts: ["localhost", "thenext.ddns.net", "tnstrack.ddns.net"],
    allowedHosts: "all", // Permitir ngrok y otros hosts externos
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
        target: "http://localhost:1337", // ✅ Backend Express
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost", // ✅ CRÍTICO: Reescribir dominio de cookies
        cookiePathRewrite: "/", // ✅ Asegurar path correcto en cookies
        logLevel: "debug", // ✅ Ver logs del proxy en consola
        onProxyReq: (proxyReq, req, res) => {
          // ✅ Log para debugging
          console.log('[Proxy] →', req.method, req.url, '→ http://localhost:1337' + req.url);
        },
        onProxyRes: (proxyRes, req, res) => {
          // ✅ Log para debugging
          console.log('[Proxy] ←', proxyRes.statusCode, req.url);
        },
      },
    ],
  },
};
