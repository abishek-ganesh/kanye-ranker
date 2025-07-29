#!/bin/bash

# Download missing album covers for Kanye West albums
# Run this script from the kanye_app directory

ALBUM_DIR="assets/album-covers"

echo "Downloading missing album covers..."

# 808s & Heartbreak (2008)
echo "Downloading 808s & Heartbreak..."
curl -L "https://upload.wikimedia.org/wikipedia/en/f/f1/808s_%26_Heartbreak.png" -o "$ALBUM_DIR/808s-heartbreak.jpg"

# Donda (2021)
echo "Downloading Donda..."
curl -L "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Donda_by_Kanye_West.jpg/1200px-Donda_by_Kanye_West.jpg" -o "$ALBUM_DIR/donda.jpg"

# Donda 2 (2022)
echo "Downloading Donda 2..."
curl -L "https://upload.wikimedia.org/wikipedia/en/2/26/Donda_2_Cover.jpg" -o "$ALBUM_DIR/donda-2.jpg"

# Jesus Is King (2019)
echo "Downloading Jesus Is King..."
curl -L "https://upload.wikimedia.org/wikipedia/en/a/a4/Kanye_West_-_Jesus_Is_King.png" -o "$ALBUM_DIR/jesus-is-king.jpg"

# Kids See Ghosts (2018)
echo "Downloading Kids See Ghosts..."
curl -L "https://upload.wikimedia.org/wikipedia/en/0/00/Kids_See_Ghost_album_cover.jpg" -o "$ALBUM_DIR/kids-see-ghosts.jpg"

# Vultures (2024)
echo "Downloading Vultures..."
# Using a generic dark placeholder for Vultures as it's very recent
curl -L "https://via.placeholder.com/600/000000/FFFFFF?text=VULTURES" -o "$ALBUM_DIR/vultures.jpg"

# Vultures 2 (2024)
echo "Downloading Vultures 2..."
# Using a generic dark placeholder for Vultures 2 as it's very recent
curl -L "https://via.placeholder.com/600/111111/FFFFFF?text=VULTURES+2" -o "$ALBUM_DIR/vultures-2.jpg"

# Watch The Throne (2011)
echo "Downloading Watch The Throne..."
curl -L "https://upload.wikimedia.org/wikipedia/en/e/ee/Watch_The_Throne.jpg" -o "$ALBUM_DIR/watch-the-throne.jpg"

echo "Done downloading album covers!"
echo "Checking downloaded files..."
ls -la "$ALBUM_DIR"/*.jpg | grep -E "(808s|donda|jesus|kids|vultures|watch)"