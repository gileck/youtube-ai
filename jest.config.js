module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/core/pure-functions/**/*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  moduleFileExtensions: ['js', 'json', 'node'],
  testPathIgnorePatterns: ['/node_modules/']
};
