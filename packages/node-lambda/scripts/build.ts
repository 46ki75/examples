import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.mjs",
  format: "esm",
  bundle: true,
  keepNames: true,
});
