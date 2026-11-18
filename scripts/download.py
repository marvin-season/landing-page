#!/usr/bin/env python3
"""Save a few Girls Rating list previews for offline viewing.

The list page is an empty shell. Images come from /api/cosplay.
Files are WebP even when the URL ends in .jpg.
Output goes to ./public/images/18 from the repo root.
"""

import argparse
import json
import urllib.request
from pathlib import Path

API = "https://www.girls-rating.com/api/cosplay"
REFERER = "https://www.girls-rating.com/lists"
OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "18"


def fetch_json(page: int, page_size: int) -> dict:
    url = f"{API}?page={page}&pageSize={page_size}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Referer": REFERER},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Referer": REFERER},
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        dest.write_bytes(response.read())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--count", type=int, default=10)
    args = parser.parse_args()
    if args.count < 1 or args.count > 20:
        raise SystemExit("--count must be from 1 to 20")

    payload = fetch_json(args.page, args.count)
    items = payload["data"]["list"]
    OUT.mkdir(parents=True, exist_ok=True)
    existing = {path.name.split("-", 1)[-1] for path in OUT.glob("*.webp")}
    start = 1 + sum(1 for path in OUT.glob("*.webp"))

    saved = 0
    for item in items:
        filename = item["resourceUrl"].rsplit("/", 1)[-1]
        stem = filename.rsplit(".", 1)[0]
        if f"{stem}.webp" in existing:
            print(f"skip {stem}")
            continue
        dest = OUT / f"{start + saved:02d}-{stem}.webp"
        download(item["resourceUrl"], dest)
        print(dest.name)
        saved += 1
    print(f"saved {saved} -> {OUT}")


if __name__ == "__main__":
    main()
