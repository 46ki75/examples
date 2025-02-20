import { build } from "esbuild";
import { copyFileSync, createWriteStream, existsSync, rmSync } from "node:fs";
import archiver from "archiver";

if (existsSync("./dist")) {
  rmSync("./dist", { recursive: true });
}

await build({
  entryPoints: ["./src/index.ts"],
  outfile: "./dist/lambda/index.js",
  format: "esm",
  bundle: true,
  platform: "node",
  target: "esnext",
  minify: true,
  keepNames: true,
});

copyFileSync("./schema.graphql", "./dist/lambda/schema.graphql");
copyFileSync("./graphiql.html", "./dist/lambda/graphiql.html");

const output = createWriteStream("./dist/lambda.zip");
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(
    `ZIP file created successfully! Total size: ${archive.pointer()} bytes`
  );
});
archive.on("error", (err) => {
  throw err;
});
archive.pipe(output);
archive.directory("./dist/lambda", false);
await archive.finalize();
