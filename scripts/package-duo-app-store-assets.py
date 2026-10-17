#!/usr/bin/env python3
"""Package Duo captures separately so outer and inner sizes cannot be mixed."""
from pathlib import Path
import shutil, zipfile, json
root=Path(__file__).resolve().parents[1]
base=root/'store-assets/app-store/v3.0'
out=root.parent/'outputs'
for kind,size in [('outer','1398x2034'),('inner','2007x2853')]:
    source=base/f'iphone-duo-{kind}-{size}'
    pngs=sorted(source.glob('*.png'))
    assert len(pngs)==6
    dest=out/f'UPLOAD-iPhone-Duo-{kind.upper()}-{size}'
    dest.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(out/f'TapMiles-UPLOAD-iPhone-Duo-{kind.upper()}-{size}.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in pngs:
            shutil.copy2(p,dest/p.name)
            z.write(p,p.name)
        assert z.testzip() is None
    print(dest)
guide='''# iPhone Duo — TapMiles 3.0\n\nRozpakuj paczki. W App Previews and Screenshots → iPhone Duo wgraj PNG do odpowiedniego ekranu:\n\n- Outer / ekran zewnętrzny: 1398 × 2034 — sześć PNG z katalogu OUTER.\n- Inner / ekran wewnętrzny: 2007 × 2853 — sześć PNG z katalogu INNER.\n\nNie mieszaj obu rozmiarów i nie wgrywaj ZIP. Header i Search Results mają osobne pliki i pola. Wszystkie obrazy są sRGB bez przezroczystości. Ujęcia pochodzą z symulatora Duo, z fikcyjnymi danymi demonstracyjnymi, po poprawieniu poziomych safe areas w aplikacji.\n\nhttps://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications\n'''
(base/'DUO-UPLOAD-GUIDE-PL.md').write_text(guide)
(out/'TapMiles-iPhone-Duo-Instrukcja.md').write_text(guide)
shutil.copy2(base/'DUO-VALIDATION.json',out/'TapMiles-iPhone-Duo-Validation.json')
