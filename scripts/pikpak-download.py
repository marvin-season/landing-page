#!/usr/bin/env python3
"""Download a file from your own PikPak account.

Reads PIKPAK_USERNAME and PIKPAK_PASSWORD from the environment or .env.local.
Reuses .local/pikpak-session.json after the first login.

Examples:
  uv run --with pikpakapi python3 scripts/pikpak-download.py "magnet:?xt=urn:btih:..."
  uv run --with pikpakapi python3 scripts/pikpak-download.py --file-id FILE_ID
  uv run --with pikpakapi python3 scripts/pikpak-download.py --list
"""

import argparse
import asyncio
import json
import os
import time
from pathlib import Path

import httpx
from pikpakapi import PikPakApi

ROOT = Path(__file__).resolve().parent.parent
SESSION = ROOT / ".local" / "pikpak-session.json"
DEFAULT_OUT = ROOT / ".local" / "pikpak"
PHASES = [
    "PHASE_TYPE_PENDING",
    "PHASE_TYPE_RUNNING",
    "PHASE_TYPE_COMPLETE",
    "PHASE_TYPE_ERROR",
]


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key not in {"PIKPAK_USERNAME", "PIKPAK_PASSWORD"}:
            continue
        os.environ.setdefault(key, value.strip().strip('"').strip("'"))


def save_session(client: PikPakApi) -> None:
    SESSION.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "username": client.username,
        "device_id": client.device_id,
        "user_id": client.user_id,
        "access_token": client.access_token,
        "refresh_token": client.refresh_token,
        "encoded_token": client.encoded_token,
    }
    SESSION.write_text(json.dumps(payload))
    SESSION.chmod(0o600)


async def connect() -> PikPakApi:
    load_env_file(ROOT / ".env.local")
    load_env_file(ROOT / ".env")
    if SESSION.is_file():
        client = PikPakApi.from_dict(json.loads(SESSION.read_text()))
        try:
            await client.refresh_access_token()
            save_session(client)
            return client
        except Exception as error:
            print(f"saved session expired: {error}")
            await client.httpx_client.aclose()

    username = os.environ.get("PIKPAK_USERNAME")
    password = os.environ.get("PIKPAK_PASSWORD")
    if not username or not password:
        raise SystemExit(
            "Set PIKPAK_USERNAME and PIKPAK_PASSWORD, or keep a valid "
            f"session at {SESSION}"
        )
    client = PikPakApi(username=username, password=password)
    await client.login()
    await client.refresh_access_token()
    save_session(client)
    return client


def safe_name(name: str) -> str:
    cleaned = name.replace("\x00", "").replace("/", "_").replace("\\", "_").strip()
    if cleaned in {"", ".", ".."}:
        return "unnamed"
    return cleaned


async def collect_files(
    client: PikPakApi, file_id: str, prefix: Path
) -> list[tuple[str, Path]]:
    info = await client.offline_file_info(file_id)
    name = safe_name(str(info.get("name") or file_id))
    if info.get("kind") == "drive#folder":
        found: list[tuple[str, Path]] = []
        page_token = None
        while True:
            listing = await client.file_list(
                size=100, parent_id=file_id, next_page_token=page_token
            )
            for item in listing.get("files") or []:
                found.extend(
                    await collect_files(client, item["id"], prefix / name)
                )
            page_token = listing.get("next_page_token")
            if not page_token:
                return found
    return [(file_id, prefix / name)]


async def download_file(client: PikPakApi, file_id: str, dest: Path) -> None:
    info = await client.get_download_url(file_id)
    link = info.get("web_content_link")
    if not link:
        medias = info.get("medias") or []
        if medias:
            link = (medias[0].get("link") or {}).get("url")
    if not link:
        raise SystemExit(f"no download link for {dest.name}")

    dest.parent.mkdir(parents=True, exist_ok=True)
    async with httpx.AsyncClient(follow_redirects=True, timeout=None) as http:
        async with http.stream("GET", link) as response:
            response.raise_for_status()
            total = int(response.headers.get("content-length") or 0)
            if dest.is_file() and total and dest.stat().st_size == total:
                print(f"skip {dest.relative_to(ROOT)}")
                return
            partial = dest.with_name(dest.name + ".part")
            written = 0
            with partial.open("wb") as handle:
                async for chunk in response.aiter_bytes(256 * 1024):
                    handle.write(chunk)
                    written += len(chunk)
            partial.replace(dest)
    print(f"saved {dest.relative_to(ROOT)} ({written} bytes)")


def task_from(result: dict) -> dict:
    task = result.get("task")
    if isinstance(task, dict):
        return task
    return result


async def wait_for_task(client: PikPakApi, task_id: str, timeout: int) -> str:
    deadline = time.monotonic() + timeout
    last_phase = ""
    while time.monotonic() < deadline:
        listing = await client.offline_list(phase=PHASES)
        for task in listing.get("tasks") or []:
            if task.get("id") != task_id:
                continue
            phase = str(task.get("phase") or "")
            if phase != last_phase:
                progress = task.get("progress")
                print(f"{phase} {progress if progress is not None else ''}".rstrip())
                last_phase = phase
            if phase == "PHASE_TYPE_ERROR":
                raise SystemExit(task.get("message") or "offline task failed")
            if phase == "PHASE_TYPE_COMPLETE":
                file_id = task.get("file_id") or (
                    task.get("reference_resource") or {}
                ).get("id")
                if not file_id:
                    raise SystemExit("task finished without a file id")
                return str(file_id)
        await asyncio.sleep(5)
    raise SystemExit(f"task {task_id} did not finish within {timeout}s")


async def offline_then_download(
    client: PikPakApi, url: str, out: Path, parent_id: str | None, timeout: int
) -> None:
    created = await client.offline_download(url, parent_id=parent_id)
    task = task_from(created)
    task_id = task.get("id")
    file_id = task.get("file_id")
    if task.get("phase") == "PHASE_TYPE_COMPLETE" and file_id:
        ready = str(file_id)
    elif task_id:
        ready = await wait_for_task(client, str(task_id), timeout)
    elif file_id:
        ready = str(file_id)
    else:
        raise SystemExit(f"offline download returned no task: {created}")
    files = await collect_files(client, ready, out)
    if not files:
        raise SystemExit(f"no files inside {ready}")
    for item_id, dest in files:
        await download_file(client, item_id, dest)


async def print_list(client: PikPakApi, parent_id: str | None) -> None:
    page_token = None
    while True:
        listing = await client.file_list(
            size=100, parent_id=parent_id, next_page_token=page_token
        )
        for item in listing.get("files") or []:
            kind = "dir" if item.get("kind") == "drive#folder" else "file"
            print(f"{item.get('id')}\t{kind}\t{item.get('size', '')}\t{item.get('name')}")
        page_token = listing.get("next_page_token")
        if not page_token:
            return


async def main() -> None:
    parser = argparse.ArgumentParser(description="Download files from your PikPak account")
    parser.add_argument("urls", nargs="*", help="magnet, ed2k, or http url to offline-download")
    parser.add_argument("--file-id", action="append", default=[], help="download an existing cloud file or folder")
    parser.add_argument("--list", action="store_true", help="print files in the cloud folder")
    parser.add_argument("--parent-id", help="cloud folder id for --list or new offline tasks")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="local directory")
    parser.add_argument("--timeout", type=int, default=1800, help="seconds to wait for an offline task")
    args = parser.parse_args()
    if not args.urls and not args.file_id and not args.list:
        parser.error("pass a url, --file-id, or --list")

    client = await connect()
    try:
        if args.list:
            await print_list(client, args.parent_id)
        for file_id in args.file_id:
            for item_id, dest in await collect_files(client, file_id, args.out):
                await download_file(client, item_id, dest)
        for url in args.urls:
            await offline_then_download(
                client, url, args.out, args.parent_id, args.timeout
            )
    finally:
        await client.httpx_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
