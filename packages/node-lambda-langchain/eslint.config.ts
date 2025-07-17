import { defineConfig } from "eslint/config";
import type { Linter } from "eslint";

import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  ...(tseslint.configs.recommended as Linter.Config[]),
  eslintConfigPrettier,
  { ignores: ["**/*.js", "**/*.mjs", "**/*.cjs"] },
]);
