import path from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import neverthrowMustUse from "eslint-plugin-neverthrow-must-use";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { defineConfig, globalIgnores } from "eslint/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  globalIgnores(["dist"]),


  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: [path.join(__dirname, "tsconfig.json")],
        tsconfigRootDir: __dirname,
      },
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "neverthrow-must-use": neverthrowMustUse,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "neverthrow-must-use/must-use-result": "error",
    },
  },
]);

