module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@openmaas/types$': '<rootDir>/../../libs/types/src',
    '@keycloak/keycloak-admin-client': '<rootDir>/__mocks__/keycloak-admin-client.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@keycloak/keycloak-admin-client)/)',
  ],
};
