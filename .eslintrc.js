module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  plugins: ["ternary", "@getify/proper-ternary"],
  extends: "eslint:recommended",
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
  overrides: [
    {
      files: "*.js",
      rules: {
        "no-mixed-spaces-and-tabs": "off",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
};
