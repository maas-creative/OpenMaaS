module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/index.ts',
    '!**/types/**',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@openmaas/types$': '<rootDir>/../../types/src',
    '^@openmaas/types/(.*)$': '<rootDir>/../../types/src/$1',
  },
  passWithNoTests: true,
};