/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function fixture(t, withWorkspace = true) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'TapMiles archive ')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.mkdirSync(path.join(root, 'expo/ios'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'));
  const script = path.join(root, 'scripts/archive-ios.cjs');
  fs.copyFileSync(path.resolve(__dirname, '../../scripts/archive-ios.cjs'), script);
  fs.writeFileSync(path.join(root, 'expo/app.json'), JSON.stringify({ expo: { version: '3.0.0', ios: { buildNumber: '4' } } }));
  if (withWorkspace) fs.mkdirSync(path.join(root, 'expo/ios/TapMilesMileageTracker.xcworkspace'));
  const capture = path.join(root, 'invocation.json');
  fs.writeFileSync(path.join(root, 'bin/xcodebuild'), `#!/usr/bin/env node\nrequire('fs').writeFileSync(process.env.TAPMILES_TEST_CAPTURE, JSON.stringify({args:process.argv.slice(2),cwd:process.cwd()}));\n`);
  fs.chmodSync(path.join(root, 'bin/xcodebuild'), 0o755);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8',
    env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, TAPMILES_TEST_CAPTURE: capture, TAPMILES_ARCHIVE_DIR: path.join(root, 'archives') } });
  return { root, capture, run };
}
test('Release archive uses the Pods workspace, handles spaces and keeps signing enabled', (t) => {
  const f = fixture(t), result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const { args, cwd } = JSON.parse(fs.readFileSync(f.capture, 'utf8'));
  assert.equal(args[args.indexOf('-workspace') + 1], path.join(f.root, 'expo/ios/TapMilesMileageTracker.xcworkspace'));
  assert.equal(cwd, path.join(f.root, 'expo/ios'));
  for (const arg of ['generic/platform=iOS', 'Release', 'MARKETING_VERSION=3.0.0', 'CURRENT_PROJECT_VERSION=4']) assert.ok(args.includes(arg));
  assert.ok(!args.includes('-project'));
  assert.ok(!args.includes('CODE_SIGNING_ALLOWED=NO'));
});
test('unsigned validation is explicit and distinguished from an uploadable archive', (t) => {
  const f = fixture(t), result = f.run('--unsigned');
  assert.equal(result.status, 0, result.stderr);
  const { args } = JSON.parse(fs.readFileSync(f.capture, 'utf8'));
  assert.ok(args.includes('CODE_SIGNING_ALLOWED=NO'));
  assert.match(args[args.indexOf('-archivePath') + 1], /-unsigned\.xcarchive$/);
  assert.match(result.stdout, /cannot be uploaded/);
});
test('a missing CocoaPods workspace fails before invoking xcodebuild', (t) => {
  const f = fixture(t, false), result = f.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /prebuild/);
  assert.equal(fs.existsSync(f.capture), false);
});
test('unsupported build arguments cannot change the project or disable signing', (t) => {
  const f = fixture(t), result = f.run('CODE_SIGNING_ALLOWED=NO');
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(f.capture), false);
});

test('prebuild keeps Debug and Release version/build in sync without changing Pod versions', async () => {
  const plugin = require('../plugins/with-ios-pod-warnings');
  const config = plugin({ name: 'TapMiles', slug: 'tapmiles', version: '3.0.0', ios: { buildNumber: '4' } });
  const configurations = {
    debug: { buildSettings: { PRODUCT_BUNDLE_IDENTIFIER: 'app.rork.tapmiles-mileage-tracker', MARKETING_VERSION: '1.0', CURRENT_PROJECT_VERSION: '1' } },
    release: { buildSettings: { PRODUCT_BUNDLE_IDENTIFIER: 'app.rork.tapmiles-mileage-tracker', MARKETING_VERSION: '1.0', CURRENT_PROJECT_VERSION: '1' } },
    pod: { buildSettings: { MARKETING_VERSION: '8.0', CURRENT_PROJECT_VERSION: '8' } },
  };
  const project = { pbxXCBuildConfigurationSection: () => configurations,
    hash: { project: { objects: { PBXShellScriptBuildPhase: { existing: { name: '[TapMiles] Generate Hermes dSYM' }, cleanup: { name: '[TapMiles] Clean signing metadata' } } } } } };
  await config.mods.ios.xcodeproj({ ...config, modResults: project, modRequest: { platform: 'ios', modName: 'xcodeproj', projectRoot: process.cwd() } });
  for (const key of ['debug', 'release']) {
    assert.equal(configurations[key].buildSettings.MARKETING_VERSION, '3.0.0');
    assert.equal(configurations[key].buildSettings.CURRENT_PROJECT_VERSION, '4');
  }
  assert.equal(configurations.pod.buildSettings.MARKETING_VERSION, '8.0');
  assert.equal(configurations.pod.buildSettings.CURRENT_PROJECT_VERSION, '8');
});

test('signing cleanup removes forbidden metadata only from the generated app', { skip: process.platform !== 'darwin' }, async (t) => {
  const f = fixture(t);
  const plugin = require('../plugins/with-ios-pod-warnings');
  const config = plugin({ name: 'TapMiles', slug: 'tapmiles', version: '3.0.0', ios: { buildNumber: '4' } });
  let script;
  const project = {
    pbxXCBuildConfigurationSection: () => ({}),
    hash: { project: { objects: { PBXShellScriptBuildPhase: { hermes: { name: '[TapMiles] Generate Hermes dSYM' } } } } },
    getFirstTarget: () => ({ uuid: 'APP' }),
    addBuildPhase: (_files, _type, name, _target, options) => {
      assert.equal(name, '[TapMiles] Clean signing metadata');
      script = options.shellScript.replaceAll('\\n', '\n');
      return { buildPhase: {} };
    },
  };
  await config.mods.ios.xcodeproj({ ...config, modResults: project, modRequest: { platform: 'ios', modName: 'xcodeproj', projectRoot: f.root } });
  const bundle = path.join(f.root, 'Built.app');
  const file = path.join(bundle, 'privacy.bundle/Info.plist');
  const outside = path.join(f.root, 'outside.txt');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'unchanged app resource');
  fs.writeFileSync(outside, 'unrelated source');
  for (const target of [path.dirname(file), outside]) {
    const result = spawnSync('/usr/bin/xattr', ['-wx', 'com.apple.FinderInfo', '5445585400000000000000000000000000000000000000000000000000000000', target]);
    assert.equal(result.status, 0);
  }
  assert.equal(spawnSync('/usr/bin/xattr', ['-w', 'com.apple.ResourceFork', 'old resource', file]).status, 0);
  const result = spawnSync('/bin/sh', ['-c', script], { env: { ...process.env, WRAPPER_NAME: 'Built.app', TARGET_BUILD_DIR: f.root }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(spawnSync('/usr/bin/xattr', ['-p', 'com.apple.FinderInfo', path.dirname(file)]).status, 0);
  assert.notEqual(spawnSync('/usr/bin/xattr', ['-p', 'com.apple.ResourceFork', file]).status, 0);
  assert.equal(spawnSync('/usr/bin/xattr', ['-p', 'com.apple.FinderInfo', outside]).status, 0);
  assert.equal(fs.readFileSync(file, 'utf8'), 'unchanged app resource');
});

test('CocoaPods integration keeps signing cleanup after newly copied resources and is idempotent', async (t) => {
  if (spawnSync('ruby', ['-v']).error) return t.skip('Ruby unavailable');
  const plugin = require('../plugins/with-ios-pod-warnings');
  const config = plugin({ name: 'TapMiles', slug: 'tapmiles', version: '3.0.0', ios: { buildNumber: '4' } });
  const transform = (contents) => config.mods.ios.podfile({ ...config, modResults: { contents, language: 'ruby' }, modRequest: { platform: 'ios', modName: 'podfile', projectRoot: process.cwd() } });
  const first = await transform('prepare_react_native_project!\n');
  const second = await transform(first.modResults.contents);
  assert.equal((second.modResults.contents.match(/post_integrate do/g) || []).length, 1);
  const hook = second.modResults.contents.slice(second.modResults.contents.indexOf('post_integrate do'));
  const ruby = `
require 'ostruct'
def post_integrate(&block); $integration = block; end
${hook}
Phase = Struct.new(:name)
class Target
  attr_reader :build_phases
  def initialize(phases); @build_phases = phases; end
  def shell_script_build_phases; @build_phases; end
end
class Project
  attr_reader :native_targets, :saves
  def initialize(target); @native_targets = [target]; @saves = 0; end
  def save; @saves += 1; end
end
cleanup = Phase.new('[TapMiles] Clean signing metadata')
resources = Phase.new('[CP] Copy Pods Resources')
frameworks = Phase.new('[CP] Embed Pods Frameworks')
target = Target.new([cleanup, resources, frameworks])
project = Project.new(target)
installer = OpenStruct.new(aggregate_targets: [OpenStruct.new(user_project: project), OpenStruct.new(user_project: project)])
$integration.call(installer)
abort('Wrong phase order') unless target.build_phases == [resources, frameworks, cleanup]
abort('Saved duplicate project') unless project.saves == 1
puts 'OK'
`;
  const result = spawnSync('ruby', ['-e', ruby], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /OK/);
});
