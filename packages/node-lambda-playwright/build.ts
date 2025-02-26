import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  bundle: true,
  minify: true,
  keepNames: true,
  platform: "node",
  target: "esnext",
  format: "esm",
});
