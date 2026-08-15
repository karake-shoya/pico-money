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
    // supabase start が生成する作業ディレクトリ（バンドル済みコードが入る）。
    // supabase/.gitignore で git は無視するが eslint は見に行くため、ここでも外す。
    "supabase/.temp/**",
  ]),
]);

export default eslintConfig;
