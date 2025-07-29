#!/usr/bin/env python3
import os
import requests
from time import sleep

# Album cover URLs from Wikipedia and other sources
album_covers = {
    "college-dropout.jpg": "https://upload.wikimedia.org/wikipedia/en/a/a3/Kanyewest_collegedropout.jpg",
    "late-registration.jpg": "https://upload.wikimedia.org/wikipedia/en/f/f4/Late_registration_cd_cover.jpg",
    "graduation.jpg": "https://upload.wikimedia.org/wikipedia/en/7/70/Graduation_%28album%29.jpg",
    "808s-heartbreak.jpg": "https://upload.wikimedia.org/wikipedia/en/3/30/808s_%2526_Heartbreak.png",
    "mbdtf.jpg": "https://upload.wikimedia.org/wikipedia/en/f/f0/My_Beautiful_Dark_Twisted_Fantasy.jpg",
    "watch-the-throne.jpg": "https://upload.wikimedia.org/wikipedia/en/e/ee/Watch_the_Throne.jpeg",
    "yeezus.jpg": "https://upload.wikimedia.org/wikipedia/en/0/03/Yeezus_album_cover.png",
    "life-of-pablo.jpg": "https://upload.wikimedia.org/wikipedia/en/4/4d/The_life_of_pablo_alternate.jpg",
    "ye.jpg": "https://upload.wikimedia.org/wikipedia/en/7/74/Ye_album_cover.jpg",
    "kids-see-ghosts.jpg": "https://upload.wikimedia.org/wikipedia/en/0/0a/Kids_See_Ghost_Cover.jpg",
    "jesus-is-king.jpg": "https://upload.wikimedia.org/wikipedia/en/a/a2/Kanye_West_-_Jesus_Is_King.png",
    "donda.jpg": "https://upload.wikimedia.org/wikipedia/en/4/4a/Kanye_West_-_Donda.png",
    "donda-2.jpg": "https://upload.wikimedia.org/wikipedia/en/8/8f/Kanye_West_-_Donda_2_Cover.jpg",
    "vultures-1.jpg": "https://upload.wikimedia.org/wikipedia/en/c/cf/Vultures_1_album_cover.jpg",
    "vultures-2.jpg": "https://upload.wikimedia.org/wikipedia/en/e/e2/Kanye_West_and_Ty_Dolla_Sign_-_Vultures_2.png"
}

# Create album covers directory if it doesn't exist
output_dir = "assets/album-covers"
os.makedirs(output_dir, exist_ok=True)

# Download each album cover
for filename, url in album_covers.items():
    filepath = os.path.join(output_dir, filename)
    
    if os.path.exists(filepath):
        print(f"✓ {filename} already exists, skipping...")
        continue
    
    print(f"Downloading {filename}...")
    
    try:
        response = requests.get(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        
        with open(filepath, 'wb') as f:
            f.write(response.content)
        
        print(f"✓ Downloaded {filename}")
        sleep(0.5)  # Be polite to Wikipedia
        
    except Exception as e:
        print(f"✗ Failed to download {filename}: {e}")

print("\nAll downloads complete!")