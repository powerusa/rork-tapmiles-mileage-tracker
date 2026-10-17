# TapMiles 3.0

The app source is in [`expo/`](expo/). iOS release: **3.0.0 (4)**.

## Archive in Xcode

Double-click **Open TapMiles in Xcode.command** in this folder. It opens the CocoaPods **workspace**, including both the app and Pods projects.

**Do not archive `TapMilesMileageTracker.xcodeproj` on its own.** It omits dependencies and can produce hundreds of cascading Clang errors, including a missing `EXConstants.modulemap`.

The native build also removes FinderInfo/resource-fork metadata from the generated app before signing, preventing the `resource fork, Finder information, or similar detritus not allowed` CodeSign failure ([Apple QA1940](https://developer.apple.com/library/archive/qa/qa1940/_index.html)). The cleanup runs after CocoaPods copies resources, including after a fresh prebuild.

In the workspace, select **TapMilesMileageTracker → Any iOS Device (arm64)**, keep your existing signing team, then **Product → Archive**. Archive uses Release and embeds JavaScript; Metro is only needed for Debug development.

From the repository root:

```sh
node scripts/archive-ios.cjs
python3 scripts/verify-ios-archive.py /path/to/your.xcarchive
```

The archive helper always selects the workspace and synchronizes Xcode version/build settings with `expo/app.json`. `--unsigned` is only a compiler check, not an uploadable archive. Signed archives go to the standard `~/Library/Developer/Xcode/Archives` folder; DerivedData also stays under Library, outside iCloud-synced Documents. `TAPMILES_ARCHIVE_DIR` and `TAPMILES_DERIVED_DATA_DIR` override those paths for CI. Unsigned checks go to `work/`. Generated native projects and archives stay out of Git.

When starting from a fresh clone, install Node.js and dependencies, then generate native iOS first:

```sh
cd expo
pnpm install --frozen-lockfile
pnpm exec expo prebuild --platform ios
```

The signed archive must still be distributed through Xcode Organizer and reviewed by Apple. Vendor Hermes symbol files may be absent from the published React Native binary; do not treat an empty generated dSYM as real crash symbols.

## Checks and store assets

Run `npm run typecheck`, `npm run lint`, and `npm test` inside `expo/`. The tests cover tracking, persistence, export escaping, archive workspace selection, signing mode, and prebuild version settings.

See [`store-assets/app-store/v3.0/UPLOAD-GUIDE-PL.md`](store-assets/app-store/v3.0/UPLOAD-GUIDE-PL.md) for screenshot, iPhone Duo, Header and Search Results upload instructions.
