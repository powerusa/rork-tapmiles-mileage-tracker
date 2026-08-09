const { withPodfile, withXcodeProject } = require('expo/config-plugins');

const MARKER = '# TapMiles: keep third-party CocoaPods warnings out of the app build log';
const POST_INSTALL_MARKER = '    # TapMiles: normalize generated Pod build settings';

const POD_BUILD_SETTINGS = `${POST_INSTALL_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        build_config.build_settings['OTHER_LIBTOOLFLAGS'] = '$(inherited) -no_warning_for_no_symbols'
      end

      if target.name == 'hermes-engine'
        phase = target.shell_script_build_phases.find { |item| item.name.include?('[Hermes] Replace Hermes') }
        phase.always_out_of_date = '1' if phase
      end
    end`;

module.exports = function withIosPodWarnings(config) {
  config = withPodfile(config, (podfileConfig) => {
    if (!podfileConfig.modResults.contents.includes(MARKER)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        'prepare_react_native_project!',
        `prepare_react_native_project!\n\n${MARKER}\ninhibit_all_warnings!`
      );
    }
    if (!podfileConfig.modResults.contents.includes(POST_INSTALL_MARKER)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        /(^  post_install do \|installer\|[\s\S]*?^  end$)/m,
        (postInstall) => postInstall.replace(/\n  end$/, `\n\n${POD_BUILD_SETTINGS}\n  end`)
      );
    }
    return podfileConfig;
  });

  return withXcodeProject(config, (projectConfig) => {
    const configurations = projectConfig.modResults.pbxXCBuildConfigurationSection();
    Object.values(configurations).forEach((configuration) => {
      if (configuration?.buildSettings) {
        configuration.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
        configuration.buildSettings.EXTRACT_APP_INTENTS_METADATA = 'NO';
        configuration.buildSettings.OTHER_LDFLAGS = '"$(inherited) -Wl,-no_warn_duplicate_libraries"';
        configuration.buildSettings.OTHER_CFLAGS = '"$(inherited) -Wno-nullability-completeness -Wno-incomplete-umbrella"';
        configuration.buildSettings.OTHER_CPLUSPLUSFLAGS = '"$(inherited) -Wno-nullability-completeness -Wno-incomplete-umbrella"';
        configuration.buildSettings.OTHER_SWIFT_FLAGS = '"$(inherited) -Xcc -Wno-nullability-completeness -Xcc -Wno-incomplete-umbrella"';
      }
    });
    return projectConfig;
  });
};
