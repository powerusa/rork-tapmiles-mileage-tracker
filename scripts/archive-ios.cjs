#!/usr/bin/env node
/* global __dirname */
/** Always archive the CocoaPods workspace, never the standalone project. */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const expo = path.join(root, 'expo');
const config = JSON.parse(fs.readFileSync(path.join(expo, 'app.json'), 'utf8')).expo;
const workspace = path.join(expo, 'ios/TapMilesMileageTracker.xcworkspace');
const allowed = new Set(['--unsigned']);
if (process.argv.slice(2).some((arg) => !allowed.has(arg))) {
  console.error('Usage: node scripts/archive-ios.cjs [--unsigned]');
  process.exit(1);
}
if (!fs.existsSync(workspace)) {
  console.error('Generate iOS first: cd expo && pnpm exec expo prebuild --platform ios');
  process.exit(1);
}
const unsigned = process.argv.includes('--unsigned');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const archiveRoot = process.env.TAPMILES_ARCHIVE_DIR || (unsigned
  ? path.join(root, 'work')
  : path.join(os.homedir(), 'Library/Developer/Xcode/Archives', stamp.slice(0, 10)));
const destination = path.join(archiveRoot, `TapMiles-${config.version}-${config.ios.buildNumber}-${stamp}${unsigned ? '-unsigned' : ''}.xcarchive`);
fs.mkdirSync(path.dirname(destination), { recursive: true });
console.log(`Archiving ${config.version} (${config.ios.buildNumber}) from the CocoaPods workspace.`);
console.log(unsigned ? 'Unsigned validation archive; this cannot be uploaded to Apple.' : 'Using the existing Xcode signing configuration.');
const args = ['-workspace', workspace, '-scheme', 'TapMilesMileageTracker', '-configuration', 'Release',
  '-destination', 'generic/platform=iOS', '-archivePath', destination,
  '-derivedDataPath', process.env.TAPMILES_DERIVED_DATA_DIR || path.join(os.homedir(), 'Library/Developer/Xcode/DerivedData/TapMiles-Release'),
  `MARKETING_VERSION=${config.version}`, `CURRENT_PROJECT_VERSION=${config.ios.buildNumber}`];
if (unsigned) args.push('CODE_SIGNING_ALLOWED=NO');
args.push('archive');
const result = spawnSync('xcodebuild', args, { cwd: path.join(expo, 'ios'), stdio: 'inherit',
  env: { ...process.env, NODE_BINARY: process.execPath, PATH: `${path.dirname(process.execPath)}:${process.env.PATH || ''}` } });
if (result.error) console.error(result.error.message);
if (result.status === 0) {
  // File-provider metadata can reappear while Xcode copies the signed app.
  // Remove only Apple's forbidden resource metadata from this generated archive.
  const applications = path.join(destination, 'Products/Applications');
  if (fs.existsSync(applications)) {
    for (const attribute of ['com.apple.FinderInfo', 'com.apple.ResourceFork']) {
      spawnSync('/usr/bin/xattr', ['-rd', attribute, applications], { stdio: 'ignore' });
    }
  }
  console.log(`Archive: ${destination}`);
}
process.exit(result.status ?? 1);
