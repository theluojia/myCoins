#!/usr/bin/env python3
"""Download coin images, remove background, crop to content, save as WebP."""
import json, os, sys, time, io, urllib.request
from rembg import remove
from PIL import Image

COIN_DATA = 'coin_data.json'
IMG_DIR = 'coins/img'
QUALITY = 85
DELAY = 0.3  # seconds between downloads

os.makedirs(IMG_DIR, exist_ok=True)

with open(COIN_DATA) as f:
    coins = json.load(f)

total = len(coins)
processed = skipped = failed = 0

for idx, coin in enumerate(coins):
    cid = coin['id']
    for side, key in [('f', 'imageUrl'), ('b', 'imageUrl2')]:
        url = coin.get(key, '')
        if not url:
            continue
        out_path = os.path.join(IMG_DIR, f'{cid}_{side}.webp')
        if os.path.exists(out_path):
            skipped += 1
            continue

        try:
            # Download
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.cbpm.cn/'
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                img_data = resp.read()

            # Open and remove background
            img = Image.open(io.BytesIO(img_data))
            if img.mode != 'RGB' and img.mode != 'RGBA':
                img = img.convert('RGB')
            result = remove(img)

            # Crop to content bounds
            bbox = result.getbbox()
            if bbox:
                result = result.crop(bbox)

            # Save as WebP (keep original resolution)
            result.save(out_path, 'WEBP', quality=QUALITY)
            processed += 1
            print(f'[{idx+1}/{total}] {cid}_{side}  {result.width}x{result.height}')

        except Exception as e:
            failed += 1
            print(f'[{idx+1}/{total}] {cid}_{side}  FAILED: {e}', file=sys.stderr)

        time.sleep(DELAY)

print(f'\nDone: {processed} processed, {skipped} skipped, {failed} failed')
