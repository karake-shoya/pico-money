import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 純粋ロジックの単体テスト。DOM 不要なので node 環境。
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
