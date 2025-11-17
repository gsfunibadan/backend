import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{,ts,}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: { globals: globals.browser },
    },
    tseslint.configs.recommended,
]);

// import tseslint from "@typescript-eslint/eslint-plugin";
// import tsparser from "@typescript-eslint/parser";
// import prettierPlugin from "eslint-plugin-prettier";
// import prettierConfig from "eslint-config-prettier";

// export default [
//   {
//     files: ["**/*.ts"],

//     languageOptions: {
//       parser: tsparser,
//       sourceType: "module",
//     },

//     plugins: {
//       "@typescript-eslint": tseslint,
//       prettier: prettierPlugin,
//     },

//     rules: {
//       ...tseslint.configs.recommended.rules,
//       ...prettierConfig.rules,
//       "@typescript-eslint/no-unused-vars": "warn",
//       "no-console": "warn",
//       "semi": ["error", "always"],
//       "quotes": ["error", "double"],
//       "prettier/prettier": "error",
//     },
//   },
// ];
