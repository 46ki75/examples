import type { Plugin } from "esbuild";
import { createWriteStream, existsSync, rmSync } from "node:fs";
import archiver from "archiver";

const zipPlugin = ({
  outputPath,
  sourceDir,
}: {
  outputPath: string;
  sourceDir: string;
}): Plugin => ({
  name: "esbuild-plugin-zip",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        console.error("Build failed, skipping ZIP creation.");
        return;
      }

      if (existsSync(outputPath)) {
        rmSync(outputPath);
      }

      console.log(`Creating ZIP file: ${outputPath}`);
      const output = createWriteStream(outputPath);
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
      archive.directory(sourceDir, false);

      await archive.finalize();
    });
  },
});

export { zipPlugin };
