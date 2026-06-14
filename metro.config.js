const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, "..", "calc-engine"),
];

module.exports = withNativeWind(config, { input: "./global.css" });
