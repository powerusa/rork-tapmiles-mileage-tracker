const { withInfoPlist, withAppDelegate } = require('expo/config-plugins');

// Expo SDK 54 predates the scene lifecycle required by the iOS 27 SDK.
// Keep the adaptation in prebuild rather than an ignored generated Swift file.
module.exports = function withIosScenes(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).TapMilesSceneDelegate',
          },
        ],
      },
    };
    return mod;
  });
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift')
      throw new Error('TapMiles scene integration requires a Swift AppDelegate.');
    let source = mod.modResults.contents;
    if (source.includes('class TapMilesSceneDelegate:')) return mod;
    const startup =
      /#if os\(iOS\) \|\| os\(tvOS\)[\s\S]*?factory\.startReactNative\([\s\S]*?#endif/;
    if (!startup.test(source))
      throw new Error('Expo AppDelegate startup changed; review TapMiles scene integration.');
    source = source.replace(
      '  var window: UIWindow?',
      '  var window: UIWindow?\n  var tapMilesLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?',
    );
    source = source.replace(startup, '    tapMilesLaunchOptions = launchOptions');
    source += `

class TapMilesSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    var launchOptions = appDelegate.tapMilesLaunchOptions ?? [:]
    if let context = connectionOptions.urlContexts.first {
      launchOptions[.url] = context.url
    }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
    window.makeKeyAndVisible()
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let context = URLContexts.first else { return }
    _ = (UIApplication.shared.delegate as? AppDelegate)?.application(
      UIApplication.shared, open: context.url, options: [.sourceApplication: context.options.sourceApplication as Any])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = (UIApplication.shared.delegate as? AppDelegate)?.application(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;
    mod.modResults.contents = source;
    return mod;
  });
};
