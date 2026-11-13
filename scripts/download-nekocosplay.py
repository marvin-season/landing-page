#!/usr/bin/env python3
"""Save a few NekoCosplay list previews for offline viewing.

The list page is server-rendered HTML at /?page=N.
Thumbnails are already WebP on static.nekocosplay.net.
Output goes to ./public/images/18/nekocosplay from the repo root.
"""

import argparse
import re
import urllib.request
from pathlib import Path

LIST = "https://nekocosplay.net/"
REFERER = "https://nekocosplay.net/"
OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "18" / "nekocosplay"
THUMB = re.compile(
    r"https://static\.nekocosplay\.net/thumbnails/([A-Za-z0-9_-]+)\.webp"
)
PAGE_SIZE = 24


def fetch_html(page: int) -> str:
    url = LIST if page == 1 else f"{LIST}?page={page}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Referer": REFERER},
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode("utf-8", "replace")


def thumbnail_urls(html: str) -> list[str]:
    seen: set[str] = set()
    urls: list[str] = []
    for stem in THUMB.findall(html):
        if stem in seen:
            continue
        seen.add(stem)
        urls.append(f"https://static.nekocosplay.net/thumbnails/{stem}.webp")
    return urls


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
    if args.page < 1:
        raise SystemExit("--page must be at least 1")
    if args.count < 1 or args.count > PAGE_SIZE:
        raise SystemExit(f"--count must be from 1 to {PAGE_SIZE}")

    urls = thumbnail_urls(fetch_html(args.page))[: args.count]
    if not urls:
        raise SystemExit(f"no thumbnails on page {args.page}")

    OUT.mkdir(parents=True, exist_ok=True)
    existing = {path.name.split("-", 1)[-1] for path in OUT.glob("*.webp")}
    start = 1 + sum(1 for path in OUT.glob("*.webp"))

    saved = 0
    for url in urls:
        stem = url.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        if f"{stem}.webp" in existing:
            print(f"skip {stem}")
            continue
        dest = OUT / f"{start + saved:02d}-{stem}.webp"
        download(url, dest)
        print(dest.name)
        saved += 1
    print(f"saved {saved} -> {OUT}")


if __name__ == "__main__":
    main()
