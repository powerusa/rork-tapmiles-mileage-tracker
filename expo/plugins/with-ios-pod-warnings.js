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
    // The vendor binary lacks DWARF; build the matching RN-pinned Hermes source.
    podfileConfig.modResults.contents = "ENV['RCT_BUILD_HERMES_FROM_SOURCE'] = 'true'\n" +
      podfileConfig.modResults.contents.replace(/^ENV\['RCT_BUILD_HERMES_FROM_SOURCE'\].*\n?/gm, '');
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
    const hostCompilerMarker = '# TapMiles: build the host Hermes compiler in Release mode';
    if (!podfileConfig.modResults.contents.includes(hostCompilerMarker)) {
      podfileConfig.modResults.contents = podfileConfig.modResults.contents.replace(
        "      if target.name == 'hermes-engine'",
        () => `${hostCompilerMarker}
      if target.name == 'hermes-engine'
        host_phase = target.shell_script_build_phases.find { |item| item.shell_script.include?('build-hermesc-xcode.sh') }
        if host_phase && !host_phase.shell_script.include?('-DCMAKE_BUILD_TYPE=Release')
          invocation = '          . $' + '{REACT_NATIVE_PATH}/sdks/hermes-engine/utils/build-hermesc-xcode.sh'
          configure = '          "$CMAKE_BINARY" -S "$' + '{PODS_ROOT}/hermes-engine" -B "$' + '{PODS_ROOT}/hermes-engine/build_host_hermesc" -DCMAKE_BUILD_TYPE=Release'
          host_phase.shell_script = host_phase.shell_script.sub(invocation, configure + "\\n" + invocation)
        end`
      );
    }
    const integrationMarker = '# TapMiles: clean metadata after CocoaPods copies resources and frameworks';
    if (!podfileConfig.modResults.contents.includes(integrationMarker)) {
      podfileConfig.modResults.contents += `

${integrationMarker}
post_integrate do |installer|
  installer.aggregate_targets.map(&:user_project).uniq.each do |project|
    project.native_targets.each do |target|
      cleanup = target.shell_script_build_phases.find { |phase| phase.name == '[TapMiles] Clean signing metadata' }
      next unless cleanup
      target.build_phases.delete(cleanup)
      target.build_phases << cleanup
    end
    project.save
  end
end
`;
    }
    return podfileConfig;
  });

  return withXcodeProject(config, (projectConfig) => {
    const project = projectConfig.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    Object.values(configurations).forEach((configuration) => {
      if (configuration?.buildSettings) {
        if (configuration.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
          configuration.buildSettings.MARKETING_VERSION = projectConfig.version;
          configuration.buildSettings.CURRENT_PROJECT_VERSION = projectConfig.ios.buildNumber;
        }
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
    const existingHermesPhase = Object.values(shellPhases).find(
      (phase) => typeof phase === 'object' && phase?.name?.includes(phaseName)
    );
    const hermesPhase = existingHermesPhase || project.addBuildPhase(
      [], 'PBXShellScriptBuildPhase', phaseName, project.getFirstTarget().uuid,
      { shellPath: '/bin/sh', shellScript: '' }
    ).buildPhase;
    hermesPhase.inputPaths = ['"$(PODS_ROOT)/hermes-engine/destroot/Library/Frameworks/ios/hermes.framework/hermes"'];
    hermesPhase.outputPaths = ['"$(DWARF_DSYM_FOLDER_PATH)/hermes.framework.dSYM"'];
    hermesPhase.shellScript = JSON.stringify([
      'set -eu',
      'if [ "$CONFIGURATION" = "Release" ]; then',
      '  test -f "$SCRIPT_INPUT_FILE_0"',
      '  mkdir -p "$DWARF_DSYM_FOLDER_PATH"',
      '  xcrun dsymutil "$SCRIPT_INPUT_FILE_0" -o "$SCRIPT_OUTPUT_FILE_0"',
      '  test -s "$SCRIPT_OUTPUT_FILE_0/Contents/Resources/DWARF/hermes"',
      'fi',
    ].join('\n'));
    // Finder/iCloud metadata on generated resource bundles makes codesign fail.
    // Limit cleanup to the built app and the two attributes forbidden by Apple QA1940.
    const cleanupName = '[TapMiles] Clean signing metadata';
    const hasCleanup = Object.values(shellPhases).some(
      (phase) => typeof phase === 'object' && phase?.name?.includes(cleanupName)
    );
    if (!hasCleanup) {
      const cleanup = project.addBuildPhase([], 'PBXShellScriptBuildPhase', cleanupName, project.getFirstTarget().uuid, {
        shellPath: '/bin/sh',
        shellScript: [
          'case "$WRAPPER_NAME" in *.app) ;; *) exit 0 ;; esac',
          'app_bundle="$TARGET_BUILD_DIR/$WRAPPER_NAME"',
          'if [ -d "$app_bundle" ]; then',
          '  /usr/bin/xattr -dr com.apple.FinderInfo "$app_bundle" 2>/dev/null || true',
          '  /usr/bin/xattr -dr com.apple.ResourceFork "$app_bundle" 2>/dev/null || true',
          'fi',
        ].join('\\n'),
      });
      cleanup.buildPhase.alwaysOutOfDate = 1;
    }
    return projectConfig;
  });
};
