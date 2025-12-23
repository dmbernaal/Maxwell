module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
    // Transform ESM modules
    '^.+\\.js$': ['ts-jest', {
      useESM: true,
    }],
  },
  // Handle ESM modules like p-limit
  transformIgnorePatterns: [
    '/node_modules/(?!(p-limit|yocto-queue)/)',
  ],
  // Properly handle ESM
  extensionsToTreatAsEsm: ['.ts'],
};
