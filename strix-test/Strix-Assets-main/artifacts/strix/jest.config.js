module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [
    "node_modules/(?!.*((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))"
  ],
  setupFilesAfterEnv: ["<rootDir>/jest-setup.js"],
  // rtlOracle.ts is a shared test helper (not a suite); keep Jest's default
  // node_modules ignore and prevent the helper from being treated as an empty suite.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/lib/__tests__/rtlOracle.ts"],
};
