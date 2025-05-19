import tseslint from 'typescript-eslint';
import ternary from 'eslint-plugin-ternary';
import getifyProperTernary from '@getify/eslint-plugin-proper-ternary';

export default tseslint.config(
  {
    files: ['src/**/*.ts'],
    plugins: {
      ternary: ternary,
      "@getify/proper-ternary": getifyProperTernary,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
        ecmaVersion: 2021,
      },
    },
    rules: {
      "no-constant-binary-expression": "error",
      "no-useless-concat": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "ternary/no-dupe": "warn",
      "ternary/no-unreachable": "error",
      "@getify/proper-ternary/parens": "error",
    },
  }
);
