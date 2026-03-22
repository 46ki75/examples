import { build } from "esbuild";
import { zipPlugin } from "./plugin.js";

import { devDependencies } from "../package.json";

await build({
  entryPoints: ["./src/index.ts"],
  outfile: "./dist/lambda/index.mjs",
  format: "esm",
  platform: "node",
  target: "esnext",
  bundle: true,
  minify: true,
  keepNames: true,
  plugins: [
    zipPlugin({
      outputPath: "./dist/lambda.zip",
      sourceDir: "./dist/lambda",
    }),
  ],
  external: Object.keys(devDependencies),
});
