from PIL import Image
import os

public_dir = 'public'
logo_path = os.path.join(public_dir, 'logo_pwa.png')

if not os.path.exists(logo_path):
    print(f"Error: {logo_path} not found")
    exit(1)

try:
    # Open the original logo
    img = Image.open(logo_path)
    
    # Create 192x192 version
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join(public_dir, 'logo_pwa_192.png'))
    print("✓ Created logo_pwa_192.png")
    
    # Create 512x512 version
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(public_dir, 'logo_pwa_512.png'))
    print("✓ Created logo_pwa_512.png")
    
    print("Logo resizing complete!")
    
except Exception as e:
    print(f"Error: {e}")
    exit(1)
