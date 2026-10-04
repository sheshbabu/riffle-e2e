#!/bin/sh
# Regenerates the fixture photos, which are committed so every run imports the same bytes.
# Needs ImageMagick, exiftool and ffmpeg.
set -e

cd "$(dirname "$0")"
rm -rf photos
mkdir -p photos/trip photos/phone

# name, size, gradient, date, make, model, latitude, longitude
photo() {
  magick -size "$2" "gradient:$3" -quality 85 "photos/$1"
  exiftool -q -overwrite_original \
    -DateTimeOriginal="$4" -Make="$5" -Model="$6" \
    -GPSLatitude="$7" -GPSLatitudeRef="$7" -GPSLongitude="$8" -GPSLongitudeRef="$8" \
    -ISO=200 -FNumber=2.8 -ExposureTime=1/250 -FocalLength=35 \
    "photos/$1"
}

photo trip/kyoto-temple.jpg 1200x800 "#c0392b-#f5b041" "2024:04:02 09:15:00" FUJIFILM X-T5 35.0116 135.7681
photo trip/kyoto-garden.jpg 800x1200 "#1e8449-#82e0aa" "2024:04:02 11:40:00" FUJIFILM X-T5 35.0394 135.7292
photo trip/osaka-night.jpg 1200x800 "#1b2631-#5dade2" "2024:04:05 21:05:00" FUJIFILM X-T5 34.6937 135.5023
photo phone/beach.jpg 1200x900 "#2874a6-#f9e79f" "2023:08:14 17:30:00" Apple "iPhone 15" -33.8908 151.2743
photo phone/birthday.jpg 900x1200 "#884ea0-#f5cba7" "2023:12:24 19:00:00" Apple "iPhone 15" 1.3521 103.8198
photo phone/hike.jpg 1200x800 "#6e2c00-#abebc6" "2022:06:11 08:20:00" Google "Pixel 7" 47.3769 8.5417

# Two frames a second apart with the same picture, which riffle groups as a burst.
photo trip/burst-1.jpg 1200x800 "#d35400-#fdebd0" "2024:04:03 14:00:00" FUJIFILM X-T5 35.0116 135.7681
photo trip/burst-2.jpg 1200x800 "#d35400-#fdebd0" "2024:04:03 14:00:01" FUJIFILM X-T5 35.0116 135.7681
exiftool -q -overwrite_original -ImageDescription="second frame" photos/trip/burst-2.jpg

# The same bytes in two folders, which riffle imports once.
cp photos/phone/beach.jpg photos/trip/beach-copy.jpg

# No EXIF at all, so riffle falls back to the file's modification time.
magick -size 1000x1000 "gradient:#566573-#d5d8dc" photos/phone/screenshot.png
touch -t 202101150930 photos/phone/screenshot.png

ffmpeg -loglevel error -f lavfi -i "testsrc=duration=2:size=640x360:rate=24" -pix_fmt yuv420p \
  -metadata creation_time="2024-04-04T10:00:00Z" photos/trip/clip.mp4
