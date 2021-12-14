/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
	roots: ['<rootDir>/__tests__'],
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/*.spec.ts'],
};
