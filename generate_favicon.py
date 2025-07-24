#!/usr/bin/env python3
"""
Generate proper favicon files from SVG for Google compatibility
"""

import cairosvg
from PIL import Image
import io
import os

# SVG content from the existing favicon
svg_content = '''<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" fill="#ff6b6b" r="15"/><path d="m19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65c-.03-.24-.24-.42-.49-.42h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64zm-7.43 2.52c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" fill="#fff" transform="translate(4 4)"/></svg>'''

# Create public directory if it doesn't exist
public_dir = '/Users/thomaslucia/ct-automation-site/public'
if not os.path.exists(public_dir):
    os.makedirs(public_dir)

# Function to create PNG from SVG at specific size
def create_png(size):
    png_data = cairosvg.svg2png(
        bytestring=svg_content.encode('utf-8'),
        output_width=size,
        output_height=size
    )
    return Image.open(io.BytesIO(png_data))

# Generate PNG files in various sizes
sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'favicon-192x192.png': 192,
    'favicon-512x512.png': 512,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512
}

print("Generating PNG files...")
for filename, size in sizes.items():
    img = create_png(size)
    img.save(os.path.join(public_dir, filename), 'PNG')
    print(f"✓ Created {filename}")

# Generate ICO file with multiple sizes
print("\nGenerating favicon.ico...")
ico_sizes = [16, 32, 48]
ico_images = []

for size in ico_sizes:
    img = create_png(size)
    ico_images.append(img)

# Save as ICO with multiple sizes
ico_images[0].save(
    os.path.join(public_dir, 'favicon.ico'),
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)],
    append_images=ico_images[1:]
)
print("✓ Created favicon.ico with 16x16, 32x32, and 48x48 sizes")

# Create web app manifest
manifest = {
    "name": "CT Business Automations",
    "short_name": "CT Automations",
    "icons": [
        {
            "src": "/android-chrome-192x192.png",
            "sizes": "192x192",
            "type": "image/png"
        },
        {
            "src": "/android-chrome-512x512.png",
            "sizes": "512x512",
            "type": "image/png"
        }
    ],
    "theme_color": "#ff6b6b",
    "background_color": "#ffffff",
    "display": "standalone"
}

import json
with open(os.path.join(public_dir, 'site.webmanifest'), 'w') as f:
    json.dump(manifest, f, indent=2)
print("✓ Created site.webmanifest")

print("\n✅ All favicon files generated successfully!")
print("\nNext step: Update the HTML head tags in your Layout.astro file")