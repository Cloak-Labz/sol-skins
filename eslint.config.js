module.exports = {
  root: true,
  extends: ['./packages/config/eslint.js'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'target/',
    '.anchor/',
    'coverage/',
  ],
};
