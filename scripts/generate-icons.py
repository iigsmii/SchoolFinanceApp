#!/usr/bin/env python3
"""Generate web/PWA and Android launcher icons from the dashboard's app-logo.jpg."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "app-logo.jpg"
if not SOURCE.exists():
    raise SystemExit(f"Logo source not found: {SOURCE}")

with Image.open(SOURCE) as opened:
    source = ImageOps.exif_transpose(opened).convert("RGBA")

def square_logo(size: int) -> Image.Image:
    return ImageOps.fit(source, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))

for filename, size in [
    ("pwa-192x192.png", 192),
    ("pwa-512x512.png", 512),
    ("pwa-maskable-512x512.png", 512),
    ("apple-touch-icon.png", 180),
]:
    square_logo(size).save(ROOT / "public" / filename, format="PNG", optimize=True)

# Android resources are created by the build workflow after Capacitor sync.
android_res = ROOT / "android" / "app" / "src" / "main" / "res"
if android_res.exists():
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for density, size in densities.items():
        folder = android_res / f"mipmap-{density}"
        folder.mkdir(parents=True, exist_ok=True)
        square_logo(size).save(folder / "ic_launcher.png", format="PNG", optimize=True)
        square_logo(size).save(folder / "ic_launcher_round.png", format="PNG", optimize=True)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        logo = square_logo(max(1, int(size * 0.66)))
        canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
        canvas.save(folder / "ic_launcher_foreground.png", format="PNG", optimize=True)

    adaptive = android_res / "mipmap-anydpi-v26"
    adaptive.mkdir(parents=True, exist_ok=True)
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
'''
    (adaptive / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (adaptive / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")
    values = android_res / "values"
    values.mkdir(parents=True, exist_ok=True)
    (values / "ic_launcher_colors.xml").write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
''', encoding="utf-8")

print("Generated PWA and Android launcher icons from public/app-logo.jpg")
