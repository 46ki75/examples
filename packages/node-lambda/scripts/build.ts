import { build } from "esbuild";

await build({
  entryPoints: ["src/handlers/index.ts"],
  outdir: "dist",
  format: "esm",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  keepNames: true,
});
