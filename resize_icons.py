
from PIL import Image
import os

source_path = r'C:\Users\yawar\.gemini\antigravity\brain\6ce5cc12-e026-42f9-beda-70d8bda29bba\uploaded_media_1_1769774065561.png'
dest_dir = r'c:\Users\yawar\Documents\StreamVault\extension\icons'

if not os.path.exists(dest_dir):
    os.makedirs(dest_dir)

try:
    img = Image.open(source_path)
    # Ensure it's square or center crop? The user uploaded image looks square-ish.
    # We'll just resize.
    
    sizes = [16, 48, 128]
    for size in sizes:
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        save_path = os.path.join(dest_dir, f'icon{size}.png')
        resized.save(save_path)
        print(f'Saved {save_path}')
        
except Exception as e:
    print(f'Error: {e}')

