import { build } from "esbuild";
import { zipPlugin } from "./plugin.js";

await build({
  entryPoints: ["./src/index.ts"],
  outfile: "./dist/lambda/index.mjs",
  format: "esm",
  platform: "node",
  target: "esnext",
  bundle: true,
  minify: true,
  keepNames: true,
  external: ["@aws/durable-execution-sdk-js", "@aws-sdk/client-ssm"],
  plugins: [
    zipPlugin({
      outputPath: "./dist/lambda.zip",
      sourceDir: "./dist/lambda",
    }),
  ],
});
