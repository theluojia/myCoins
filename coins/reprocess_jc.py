#!/usr/bin/env python3
"""Reprocess JC (commemorative notes) images - simple white-bg removal + crop.
JC06-1/JC06-2: one image contains two notes side by side, split into f(left)/b(right)."""
import json, os, io, urllib.request
from PIL import Image

COIN_DATA = 'coin_data.json'
IMG_DIR = 'coins/img'
THRESHOLD = 240  # pixels brighter than this are considered "white background"
FUZZ = 5         # extra padding inside crop

os.makedirs(IMG_DIR, exist_ok=True)

with open(COIN_DATA) as f:
    coins = json.load(f)

jc_coins = [c for c in coins if c['id'].startswith('JC')]
print(f'Found {len(jc_coins)} JC notes')

for coin in jc_coins:
    cid = coin['id']
    is_split = cid in ('JC06-1', 'JC06-2')

    url_f = coin.get('imageUrl', '')
    url_b = coin.get('imageUrl2', '')

    if is_split and url_f:
        # Download the single image that contains both front and back side by side
        print(f'{cid}: split-mode, downloading...')
        req = urllib.request.Request(url_f, headers={
            'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cbpm.cn/'
        })
        with urllib.request.urlopen(req, timeout=30) as resp:
            img = Image.open(io.BytesIO(resp.read())).convert('RGB')
        w, h = img.size
        mid = w // 2
        # Left half = front (f), right half = back (b)
        left = img.crop((0, 0, mid, h))
        right = img.crop((mid, 0, w, h))

        for side, half_img in [('f', left), ('b', right)]:
            # Remove white background
            rgba = half_img.convert('RGBA')
            data = rgba.load()
            for y in range(rgba.height):
                for x in range(rgba.width):
                    r, g, b, a = data[x, y]
                    if r > THRESHOLD and g > THRESHOLD and b > THRESHOLD:
                        data[x, y] = (r, g, b, 0)
            bbox = rgba.getbbox()
            if bbox:
                rgba = rgba.crop(bbox)
            out = os.path.join(IMG_DIR, f'{cid}_{side}.webp')
            rgba.save(out, 'WEBP', quality=85)
            print(f'  {cid}_{side}: {rgba.width}x{rgba.height}')
        continue

    # Normal JC: download front and back separately, white-bg removal
    for side, url in [('f', url_f), ('b', url_b)]:
        if not url:
            continue
        out_path = os.path.join(IMG_DIR, f'{cid}_{side}.webp')
        print(f'{cid}_{side}: downloading...')
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.cbpm.cn/'
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                img = Image.open(io.BytesIO(resp.read())).convert('RGB')

            # Remove white/near-white pixels
            rgba = img.convert('RGBA')
            data = rgba.load()
            for y in range(rgba.height):
                for x in range(rgba.width):
                    r, g, b, a = data[x, y]
                    if r > THRESHOLD and g > THRESHOLD and b > THRESHOLD:
                        data[x, y] = (r, g, b, 0)

            bbox = rgba.getbbox()
            if bbox:
                # Add small padding
                l, t, r, btm = bbox
                l = max(0, l - FUZZ)
                t = max(0, t - FUZZ)
                r = min(rgba.width, r + FUZZ)
                btm = min(rgba.height, btm + FUZZ)
                rgba = rgba.crop((l, t, r, btm))

            rgba.save(out_path, 'WEBP', quality=85)
            print(f'  {cid}_{side}: {rgba.width}x{rgba.height}')
        except Exception as e:
            print(f'  {cid}_{side}: FAILED - {e}')

print('Done!')
