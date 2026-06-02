from PIL import Image
from collections import Counter

img = Image.open('LOGO UTAMA.png').convert('RGB')
img = img.resize((50, 50))
pixels = list(img.getdata())
# Filter out white and transparent-like colors (very bright or very dark)
valid_pixels = [p for p in pixels if not (p[0]>240 and p[1]>240 and p[2]>240) and not (p[0]<15 and p[1]<15 and p[2]<15)]

if not valid_pixels:
    valid_pixels = pixels

# Get the most common colors
counts = Counter(valid_pixels)
common = counts.most_common(3)
for color, count in common:
    print(f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}")
