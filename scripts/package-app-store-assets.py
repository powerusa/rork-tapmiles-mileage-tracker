#!/usr/bin/env python3
"""Copy upload-ready assets and create a ZIP. Pass the destination parent folder."""
import argparse
from pathlib import Path
import shutil
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('destination', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = root / 'store-assets/app-store/v3.0'
package = args.destination / 'TapMiles-App-Store-3.0'
package.mkdir(parents=True, exist_ok=True)
for name in ['iphone-medium-1206x2622','iphone-large-1320x2868','ipad-13-2064x2752','metadata','extras']:
    shutil.copytree(source/name, package/name, dirs_exist_ok=True)
for name in ['App-Icon-1024.png','UPLOAD-GUIDE-PL.md','VALIDATION.json']:
    shutil.copy2(source/name, package/name)
archive = args.destination / 'TapMiles-App-Store-3.0.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(package.rglob('*')):
        if file.is_file(): z.write(file, file.relative_to(args.destination))
    assert z.testzip() is None
shutil.copy2(source/'extras/Search-results-screenshot-preview.png',args.destination/'TapMiles-App-Store-Preview.png')
shutil.copy2(source/'metadata/APP-STORE-COPY.md',args.destination/'TapMiles-App-Store-Texts.md')
shutil.copy2(source/'UPLOAD-GUIDE-PL.md',args.destination/'TapMiles-App-Store-Upload-Guide.md')
print(f'{archive}: {archive.stat().st_size:,} bytes')
print(f'{len(list(package.rglob("*.png")))} PNG files; original captures and SVG sources remain in Git only.')
