import { defineConfig, globalIgnores } from "eslint/config";
import type { Linter } from "eslint";

import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  ...(tseslint.configs.recommended as Linter.Config[]),
  eslintConfigPrettier,
  globalIgnores(["**/*.js", "**/*.mjs", "**/*.cjs"]),
]);
