import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add your own config object with overrides and rules:
  {
    files: ["**/*.ts", "**/*.tsx"], // target TS files
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // add more rules here if needed
    },
  },
];
export default eslintConfig;
