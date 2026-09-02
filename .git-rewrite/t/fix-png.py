from PIL import Image
import sys

image_path = 'public/pwa-512x512.png'

try:
    print(f"Opening {image_path}...")
    img = Image.open(image_path).convert('RGBA')
    
    print("Saving as strict PNG format...")
    img.save(image_path, 'PNG')
    
    # Verify the saved image
    Image.open(image_path).verify()
    print("✅ Success! Image successfully converted and verified as a valid PNG.")
    print("You can now run:")
    print("git add public/pwa-512x512.png")
    print("git commit -m \"fix: replace invalid image format with strict PNG\"")
    print("git push origin main")

except Exception as e:
    print(f"❌ Error processing image: {e}")
    sys.exit(1)
