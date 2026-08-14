module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.spec.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    transformIgnorePatterns: ['/node_modules/'],
    moduleNameMapper: {
        '^@chat/shared$': '<rootDir>/../shared/src/index.ts',
    },
};