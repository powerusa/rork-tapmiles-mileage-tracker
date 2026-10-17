#!/bin/zsh
set -eu
repo_root="${0:A:h}"
workspace="$repo_root/expo/ios/TapMilesMileageTracker.xcworkspace"
if [[ ! -d "$workspace" ]]; then
  print -u2 'The iOS workspace has not been generated yet.'
  print -u2 'From expo/: pnpm install --frozen-lockfile, then pnpm exec expo prebuild --platform ios'
  read '?Press Return to close.'
  exit 1
fi
/usr/bin/open -a Xcode "$workspace"
