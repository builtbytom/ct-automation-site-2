#!/usr/bin/env python3
"""
Generate proper favicon files from recreating the design in Pillow
"""

from PIL import Image, ImageDraw
import os
import json

# Create public directory if it doesn't exist
public_dir = '/Users/thomaslucia/ct-automation-site/public'
if not os.path.exists(public_dir):
    os.makedirs(public_dir)

def create_favicon_image(size):
    """Create the favicon design at specified size"""
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Calculate circle parameters
    padding = size * 0.03125  # 1/32 of size (proportional to original 1px at 32px)
    circle_radius = (size - padding * 2) / 2
    center = size / 2
    
    # Draw red circle background
    draw.ellipse(
        [padding, padding, size - padding, size - padding],
        fill='#ff6b6b'
    )
    
    # Draw gear shape (simplified version)
    # This creates a simplified gear icon in the center
    gear_size = size * 0.5  # Gear takes up 50% of the icon
    gear_center = size / 2
    gear_radius = gear_size / 2
    
    # Draw center circle for gear
    center_radius = gear_radius * 0.35
    draw.ellipse(
        [
            gear_center - center_radius,
            gear_center - center_radius,
            gear_center + center_radius,
            gear_center + center_radius
        ],
        fill='white'
    )
    
    # Draw gear teeth (8 teeth)
    import math
    teeth = 8
    tooth_width = gear_radius * 0.3
    tooth_height = gear_radius * 0.25
    
    for i in range(teeth):
        angle = (2 * math.pi * i) / teeth
        x = gear_center + gear_radius * 0.7 * math.cos(angle)
        y = gear_center + gear_radius * 0.7 * math.sin(angle)
        
        # Draw rectangular tooth
        tooth_angle = angle
        corners = []
        for dx, dy in [(-tooth_width/2, -tooth_height), (tooth_width/2, -tooth_height), 
                       (tooth_width/2, tooth_height), (-tooth_width/2, tooth_height)]:
            corner_x = x + dx * math.cos(tooth_angle) - dy * math.sin(tooth_angle)
            corner_y = y + dx * math.sin(tooth_angle) + dy * math.cos(tooth_angle)
            corners.append((corner_x, corner_y))
        
        draw.polygon(corners, fill='white')
    
    # Draw inner circle to clean up center
    draw.ellipse(
        [
            gear_center - gear_radius * 0.5,
            gear_center - gear_radius * 0.5,
            gear_center + gear_radius * 0.5,
            gear_center + gear_radius * 0.5
        ],
        fill='white'
    )
    
    # Draw hole in center
    hole_radius = gear_radius * 0.2
    draw.ellipse(
        [
            gear_center - hole_radius,
            gear_center - hole_radius,
            gear_center + hole_radius,
            gear_center + hole_radius
        ],
        fill='#ff6b6b'
    )
    
    return img

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
    img = create_favicon_image(size)
    img.save(os.path.join(public_dir, filename), 'PNG')
    print(f"✓ Created {filename}")

# Generate ICO file with multiple sizes
print("\nGenerating favicon.ico...")
ico_sizes = [16, 32, 48]
ico_images = []

for size in ico_sizes:
    img = create_favicon_image(size)
    # Convert RGBA to RGB for ICO format
    ico_img = Image.new('RGB', (size, size), 'white')
    ico_img.paste(img, mask=img.split()[3])  # Use alpha channel as mask
    ico_images.append(ico_img)

# Save as ICO with multiple sizes
ico_images[0].save(
    os.path.join(public_dir, 'favicon.ico'),
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
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

with open(os.path.join(public_dir, 'site.webmanifest'), 'w') as f:
    json.dump(manifest, f, indent=2)
print("✓ Created site.webmanifest")

print("\n✅ All favicon files generated successfully!")
print("\nNext step: Update the HTML head tags in your Layout.astro file")