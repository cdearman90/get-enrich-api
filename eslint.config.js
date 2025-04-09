
import globals from "globals";
import js from "@eslint/js";

export default [
  {
    ignores: ["*.gs"], // Ignore all .gs files
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "comma-dangle": ["error", "never"], // Disallow trailing commas
      "no-unused-vars": "error", // Catch unused variables
      "consistent-return": "error", // Require consistent return values
      "no-console": ["warn", { allow: ["warn", "error"] }], // Allow console.warn and console.error
      "eqeqeq": "error", // Require === and !==
      "no-trailing-spaces": "error", // Disallow trailing spaces
      "quotes": ["error", "double"] // Enforce double quotes
    }
  }
];
