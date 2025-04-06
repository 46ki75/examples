import { build } from "esbuild";
import { zipPlugin } from "./plugin";

// if (existsSync("./dist")) {
//   rmSync("./dist", { recursive: true });
// }

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
});
