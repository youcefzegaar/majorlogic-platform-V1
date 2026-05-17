import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      // Forbid Math.random() — decision flow must be deterministic
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            "Math.random() is forbidden. Decision flow must be deterministic. Use a seeded PRNG or a platform-approved entropy source instead.",
        },
      ],

      // Pino logger is used; direct console calls should be warnings
      "no-console": "warn",

      // Warn when a file grows beyond 300 lines
      "max-lines": ["warn", 300],
    },
  },
  {
    // Ignore build artefacts and vendored code
    ignores: ["node_modules/**", "dist/**", "coverage/**"],
  },
];
