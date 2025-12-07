
export default {
  preset: 'ts-jest/presets/default-esm', // Use the ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports back to .ts files
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true, // Tell ts-jest to use ESM
      },
    ],
  },
};