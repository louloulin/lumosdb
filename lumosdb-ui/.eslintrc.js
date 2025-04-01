module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    // Temporarily disable problematic rules during development
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "warn",
    "@typescript-eslint/no-unsafe-function-type": "warn"
  }
}; 