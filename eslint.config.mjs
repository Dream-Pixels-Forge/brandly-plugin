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
      globals: {
        // Node.js 18+ globals
        fetch: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        Request: "readonly",
        Response: "readonly",
        RequestInit: "readonly",
        // Node.js globals
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Headers: "readonly",
        FormData: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        EventSource: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        structuredClone: "readonly",
        atob: "readonly",
        btoa: "readonly",
        crypto: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
];
