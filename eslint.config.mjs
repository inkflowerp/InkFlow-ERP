import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    rules: {
      "@next/next/no-location-assign-relative-destination": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn"
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".agents/**",
    "next-env.d.ts",
    "tests/**",
    "**/*.test.ts",
  ]),
]);

export default eslintConfig;
