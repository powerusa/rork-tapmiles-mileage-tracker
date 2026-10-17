#!/usr/bin/env python3
"""Validate device archive metadata, embedded JS, app symbols and code signatures."""
import argparse, json, os, plistlib, re, subprocess
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('archive', type=Path)
parser.add_argument('--unsigned', action='store_true', help='Compilation check only; not for uploading')
parser.add_argument('--report', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
config = json.loads((root/'expo/app.json').read_text())['expo']
apps = list((args.archive/'Products/Applications').glob('*.app'))
if len(apps) != 1:
    raise SystemExit('Expected exactly one application in the archive.')
app = apps[0]
info = plistlib.loads((app/'Info.plist').read_bytes())
errors, warnings = [], []
framework_symbols_report = {}
expected = {'CFBundleIdentifier': config['ios']['bundleIdentifier'], 'CFBundleShortVersionString': config['version'], 'CFBundleVersion': config['ios']['buildNumber']}
for key, value in expected.items():
    if info.get(key) != value: errors.append(f'{key}: expected {value}, got {info.get(key)}')
if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS']: errors.append('Not an iPhoneOS device archive.')
if not (app/'main.jsbundle').is_file() or (app/'main.jsbundle').stat().st_size == 0: errors.append('Embedded JavaScript is missing.')
if not (app/'PrivacyInfo.xcprivacy').is_file(): errors.append('Aggregated privacy manifest is missing.')

def uuids(file):
    result = subprocess.run(['xcrun', 'dwarfdump', '--uuid', str(file)], text=True, capture_output=True)
    if result.returncode: return set()
    return set(re.findall(r'UUID: ([0-9A-F-]+)', result.stdout))

binary = app/info['CFBundleExecutable']
if not binary.is_file() or not os.access(binary, os.X_OK): errors.append('App executable is missing or lacks executable permissions.')
app_uuids = uuids(binary)
symbols = args.archive/'dSYMs'/f'{app.name}.dSYM'
if not app_uuids or app_uuids != uuids(symbols): errors.append('App dSYM UUID does not match the executable.')
for framework in (app/'Frameworks').glob('*.framework'):
    framework_symbols = args.archive/'dSYMs'/f'{framework.name}.dSYM'
    framework_binary = framework/framework.stem
    binary_ids, symbol_ids = uuids(framework_binary), uuids(framework_symbols) if framework_symbols.exists() else set()
    framework_symbols_report[framework.name] = {'binaryUUIDs': sorted(binary_ids), 'dSYMUUIDs': sorted(symbol_ids), 'realDWARF': False}
    if not framework_symbols.exists():
        errors.append(f'{framework.name}: matching framework dSYM is missing.')
    elif not binary_ids or symbol_ids != binary_ids:
        errors.append(f'{framework.name}: dSYM UUID does not match the embedded framework.')
    else:
        process = subprocess.Popen(['xcrun', 'dwarfdump', '--debug-info', str(framework_symbols)], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
        found = False
        for line in process.stdout:
            if 'DW_TAG_compile_unit' in line:
                found = True
                process.terminate()
                break
        process.stdout.close()
        process.wait()
        framework_symbols_report[framework.name]['realDWARF'] = found
        if not found: errors.append(f'{framework.name}: dSYM contains no real DWARF compilation units.')
if not args.unsigned:
    result = subprocess.run(['/usr/bin/codesign', '--verify', '--deep', '--strict', str(app)], text=True, capture_output=True)
    if result.returncode: errors.append('Signature verification failed: '+result.stderr.strip())
    if not (app/'embedded.mobileprovision').exists(): errors.append('Provisioning profile is missing.')
report = {'version': info.get('CFBundleShortVersionString'), 'build': info.get('CFBundleVersion'), 'bundleIdentifier': info.get('CFBundleIdentifier'), 'deviceArchive': info.get('CFBundleSupportedPlatforms') == ['iPhoneOS'], 'embeddedJavaScript': (app/'main.jsbundle').is_file(), 'signedVerificationRequested': not args.unsigned, 'frameworkSymbols': framework_symbols_report, 'errors': errors, 'warnings': warnings, 'passed': not errors}
if args.report:
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
raise SystemExit(1 if errors else 0)
