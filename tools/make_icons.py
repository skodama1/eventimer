# ProTimer アプリアイコン生成
# ダークネイビー背景 + タイマーダイヤル(トラックリング + ミントの進捗アーク)
import math
import os
from PIL import Image, ImageDraw

SIZE = 1024
BG = (14, 19, 27, 255)        # #0E131B
BG_TOP = (18, 26, 38, 255)    # うっすら明るい上部
TRACK = (31, 41, 55, 255)     # #1F2937
MINT = (46, 230, 168, 255)    # #2EE6A8
MINT_GLOW = (46, 230, 168, 60)

img = Image.new("RGBA", (SIZE, SIZE), BG)
draw = ImageDraw.Draw(img)

# 背景に縦方向の微グラデーション
for y in range(SIZE):
    t = y / SIZE
    r = int(BG_TOP[0] * (1 - t) + BG[0] * t)
    g = int(BG_TOP[1] * (1 - t) + BG[1] * t)
    b = int(BG_TOP[2] * (1 - t) + BG[2] * t)
    draw.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))

cx = cy = SIZE // 2
R = 336          # リング中心半径
W = 76           # リング幅
CAP = W // 2

bbox = [cx - R, cy - R, cx + R, cy + R]

# グロー (少し太いアークを薄く重ねる)
glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
gdraw = ImageDraw.Draw(glow)
gdraw.arc([cx - R - 18, cy - R - 18, cx + R + 18, cy + R + 18],
          start=-90, end=150, fill=MINT_GLOW, width=W + 36)
img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

# トラックリング (全周)
draw.arc(bbox, start=0, end=360, fill=TRACK, width=W)

# 進捗アーク (-90°=12時 から 150° まで = 240°ぶん)
draw.arc(bbox, start=-90, end=150, fill=MINT, width=W)

# アーク両端の丸キャップ
for ang in (-90, 150):
    a = math.radians(ang)
    ex = cx + R * math.cos(a)
    ey = cy + R * math.sin(a)
    draw.ellipse([ex - CAP, ey - CAP, ex + CAP, ey + CAP], fill=MINT)

# 中央のドット (現在位置マーカー風)
draw.ellipse([cx - 46, cy - 46, cx + 46, cy + 46], fill=MINT)
draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=BG)

out_dir = r"D:\app\eventimer\icons"
os.makedirs(out_dir, exist_ok=True)

img_rgb = img.convert("RGB")  # 全面塗りなので透過不要
img_rgb.save(os.path.join(out_dir, "icon-1024.png"))
for size, name in [(512, "icon-512.png"), (192, "icon-192.png"),
                   (180, "apple-touch-icon.png"), (32, "favicon-32.png")]:
    img_rgb.resize((size, size), Image.LANCZOS).save(os.path.join(out_dir, name))

print("done:", os.listdir(out_dir))
