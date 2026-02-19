const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Make sure input matches your actual global CSS filename
module.exports = withNativeWind(config, { input: "./global.css" });