const { withPodfile, withPodfileProperties, withXcodeProject } = require('expo/config-plugins');

const MARKER = '# TapMiles: keep third-party CocoaPods warnings out of the app build log';
const POST_INSTALL_MARKER = '    # TapMiles: normalize generated Pod build settings';

const POD_BUILD_SETTINGS = `${POST_INSTALL_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        build_config.build_settings['OTHER_LIBTOOLFLAGS'] = '$(inherited) -no_warning_for_no_symbols'
        build_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -DFMT_USE_CONSTEVAL=0'
        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17' if target.name == 'fmt'
      end

      if target.name == 'hermes-engine'
        phase = target.shell_script_build_phases.find { |item| item.name.include?('[Hermes] Replace Hermes') }
        phase.always_out_of_date = '1' if phase
      end
    end`;

module.exports = function withIosPodWarnings(config) {
  config = withPodfileProperties(config, (propertiesConfig) => {
    // Source-built React Native frameworks include matching archive symbols.
    propertiesConfig.modResults['ios.buildReactNativeFromSource'] = 'true';
    return propertiesConfig;
  });

  config = withPodfile(config, (podfileConfig) => {
    if (!podfileConfig.modResults.contents.includes(MARKER)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        'prepare_react_native_project!',
        `prepare_react_native_project!\n\n${MARKER}\ninhibit_all_warnings!`
      );
    }
    if (!podfileConfig.modResults.contents.includes("ENV['RCT_BUILD_HERMES_FROM_SOURCE']")) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        'prepare_react_native_project!',
        "ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'\n\nprepare_react_native_project!"
      );
    }
    if (!podfileConfig.modResults.contents.includes(POST_INSTALL_MARKER)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        /(^  post_install do \|installer\|[\s\S]*?^  end$)/m,
        (postInstall) => postInstall.replace(/\n  end$/, `\n\n${POD_BUILD_SETTINGS}\n  end`)
      );
    }
    if (!podfileConfig.modResults.contents.includes('FMT_USE_CONSTEVAL')) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        "        build_config.build_settings['OTHER_LIBTOOLFLAGS'] = '$(inherited) -no_warning_for_no_symbols'",
        "        build_config.build_settings['OTHER_LIBTOOLFLAGS'] = '$(inherited) -no_warning_for_no_symbols'\n        build_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -DFMT_USE_CONSTEVAL=0'"
      );
    }
    if (!podfileConfig.modResults.contents.includes("target.name == 'fmt'")) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        "        build_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -DFMT_USE_CONSTEVAL=0'",
        "        build_config.build_settings['OTHER_CPLUSPLUSFLAGS'] = '$(inherited) -DFMT_USE_CONSTEVAL=0'\n        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17' if target.name == 'fmt'"
      );
    }
    return podfileConfig;
  });

  return withXcodeProject(config, (projectConfig) => {
    const project = projectConfig.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
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

    const phaseName = '[TapMiles] Generate Hermes dSYM';
    const shellPhases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    const hasHermesDsymPhase = Object.values(shellPhases).some(
      (phase) => typeof phase === 'object' && phase?.name?.includes(phaseName)
    );
    if (!hasHermesDsymPhase) {
      project.addBuildPhase([], 'PBXShellScriptBuildPhase', phaseName, project.getFirstTarget().uuid, {
        shellPath: '/bin/sh',
        inputPaths: ['"$(TARGET_BUILD_DIR)/$(FRAMEWORKS_FOLDER_PATH)/hermes.framework/hermes"'],
        outputPaths: ['"$(DWARF_DSYM_FOLDER_PATH)/hermes.framework.dSYM"'],
        shellScript: [
          'if [ "$CONFIGURATION" = "Release" ] && [ -f "$SCRIPT_INPUT_FILE_0" ]; then',
          '  mkdir -p "$DWARF_DSYM_FOLDER_PATH"',
          '  xcrun dsymutil "$SCRIPT_INPUT_FILE_0" -o "$SCRIPT_OUTPUT_FILE_0"',
          'fi',
        ].join('\\n'),
      });
    }
    return projectConfig;
  });
};
