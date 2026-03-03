#!/bin/bash
# GoSong — Local server launcher
# Opens the music player on http://localhost:8765

PORT=8765
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🎵 Starting GoSong on http://localhost:$PORT"
echo "   Press Ctrl+C to stop the server."

# Open browser after a short delay
(sleep 1 && xdg-open "http://localhost:$PORT") &

# Start Python HTTP server
cd "$DIR"
python3 -m http.server $PORT
