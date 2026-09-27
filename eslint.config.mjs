import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pre-existing W0 scripts (not owned by W1; see task-1 brief resolution 8).
    "scripts/extract-slides.mjs",
    "scripts/vendor-memes.mjs",
  ]),
]);

export default eslintConfig;
