import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
    {
        ignores: ["dist/**", "node_modules/**"],
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        plugins: { js },
        extends: ["js/recommended"],
        languageOptions: {
            globals: {
                ...globals.bunBuiltin,
                ...globals.nodeBuiltin,
            },
        },
    },
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
        rules: {
            "@typescript-eslint/restrict-template-expressions": "off",
        },
    },
    {
        files: ["test/**/*.{ts,test.ts}"],
        rules: {
            "@typescript-eslint/no-unsafe-assignment": "off",
        },
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
]);
