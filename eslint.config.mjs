import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      ...nextVitals[0]?.plugins,
    },
    rules: {
      "@next/next/no-location-assign-relative-destination": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/refs": "warn"
    }
  },
  {
    files: ["components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/services/*", "@/services", "**/services/*"],
              message: "Layering Invariant: UI components must never import services directly. Use Server Actions or lib utilities instead."
            },
            {
              group: ["@/lib/supabase/*", "@/lib/supabase", "@supabase/*", "**/lib/supabase/*"],
              message: "Layering Invariant: UI components must never import Supabase clients directly."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["actions/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/client", "@/lib/supabase/server", "@/lib/supabase/admin"],
              message: "Layering Invariant: Server Actions must not touch DB directly. Delegate database operations to services or repositories."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/client", "@/lib/supabase/server", "@/lib/supabase/admin"],
              message: "Layering Invariant: Services must not touch DB directly. Repositories are the only place that touches the DB."
            }
          ]
        }
      ]
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".agents/**",
    ".agent/**",
    "scratch/**",
    "next-env.d.ts",
    "tests/**",
    "**/*.test.ts",
  ]),
]);

export default eslintConfig;
