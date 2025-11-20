
export default [
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/*.min.js", "assets/vendor/**"],
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        XMLHttpRequest: "readonly",
        WebSocket: "readonly",
        IntersectionObserver: "readonly",
        MutationObserver: "readonly",
        ResizeObserver: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        requestIdleCallback: "readonly",
        cancelIdleCallback: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        self: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],
      "no-var": "error",
      "prefer-const": "warn",
      "eqeqeq": ["warn", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-with": "error",
      "no-script-url": "warn",
      "no-loop-func": "warn",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "consistent-return": "off",
      "curly": ["warn", "all"],
      "indent": ["warn", 2],
      "quotes": "off",
      "semi": ["error", "always"],
      "space-before-function-paren": "off",
      "no-trailing-spaces": "warn",
      "no-multiple-empty-lines": ["warn", { max: 2 }],
      "keyword-spacing": "warn",
      "comma-spacing": "warn",
    },
  },
  {
    files: ["gulpfile.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["cloudflare/worker.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        fetch: "readonly",
      },
    },
  },
  {
    files: ["sw.js"],
    languageOptions: {
      globals: {
        self: "writable",
        caches: "readonly",
        Response: "readonly",
        Promise: "readonly",
      },
    },
  },
];

