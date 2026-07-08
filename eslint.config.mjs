import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/", "node_modules/", "*.tmp"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];
