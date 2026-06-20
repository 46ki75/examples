// Shared ESLint flat config for every package under packages/. Mirrors the
// node-lambda-template convention (typescript-eslint recommended + Prettier
// compatibility). Run from the repo root via `packages/justfile`'s `lint`.
import { defineConfig, globalIgnores } from "eslint/config";
import type { Linter } from "eslint";

import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  ...(tseslint.configs.recommended as Linter.Config[]),
  eslintConfigPrettier,
  // Pin the root explicitly: typescript-eslint otherwise can't choose between
  // the multiple eslint.config.ts files in this monorepo and fails to parse.
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  globalIgnores([
    "**/*.js",
    "**/*.mjs",
    "**/*.cjs",
    "**/dist/**",
    "**/build/**",
    "**/.nitro/**",
    "**/.output/**",
  ]),
]);
