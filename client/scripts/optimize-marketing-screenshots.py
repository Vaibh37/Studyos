"""Regenerate tracked lossless screenshot variants. Requires Pillow locally."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
source = root / "docs" / "screenshots"
target = root / "client" / "public" / "studyos-screenshots"
hashes = {}
for png in sorted(source.glob("*.png")):
    if png.name not in {"dashboard.png", "tasks.png", "subjects.png", "notes.png",
                       "calendar.png", "focus.png", "progress.png", "leaderboard.png", "settings.png"}:
        continue
    image = Image.open(png).convert("RGBA")
    webp = target / png.with_suffix(".webp").name
    image.save(webp, "WEBP", lossless=True, method=6, exact=True)
    assert Image.open(webp).convert("RGBA").tobytes() == image.tobytes()
    hashes[png.name] = hashlib.sha256(png.read_bytes()).hexdigest()
(target / "source-hashes.json").write_text(json.dumps(hashes, indent=2) + "\n")
