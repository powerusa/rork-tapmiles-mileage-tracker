const { withPodfile, withXcodeProject } = require('expo/config-plugins');

const MARKER = '# TapMiles: keep third-party CocoaPods warnings out of the app build log';

module.exports = function withIosPodWarnings(config) {
  config = withPodfile(config, (podfileConfig) => {
    if (!podfileConfig.modResults.contents.includes(MARKER)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        'prepare_react_native_project!',
        `prepare_react_native_project!\n\n${MARKER}\ninhibit_all_warnings!`
      );
    }
    return podfileConfig;
  });

  return withXcodeProject(config, (projectConfig) => {
    const configurations = projectConfig.modResults.pbxXCBuildConfigurationSection();
    Object.values(configurations).forEach((configuration) => {
      if (configuration?.buildSettings) {
        configuration.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    });
    return projectConfig;
  });
};
