module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NOTE: with Reanimated v4 this plugin re-exports react-native-worklets/plugin,
    // which babel-preset-expo 57 already injects automatically. It is kept here
    // explicitly per the team's decision; applying it twice is idempotent and
    // produces identical transform output (verified).
    plugins: ['react-native-reanimated/plugin'],
  };
};
