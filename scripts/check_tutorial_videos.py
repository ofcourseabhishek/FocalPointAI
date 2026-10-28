"""Mark tutorial catalog videos that YouTube won't play in an embed.

Asks YouTube's oEmbed endpoint about every video in backend/app/data/tutorials_catalog.json.
A video that answers 200 can be embedded; 401 or 403 means private, removed or embedding
disabled, and it gets "available": false so the recommendation engine skips it. A video that
answers 200 again has the flag removed. Network errors leave the entry as it was.

    python scripts/check_tutorial_videos.py           # report and update the catalog
    python scripts/check_tutorial_videos.py --dry-run # report only
"""

from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import quote

CATALOG_PATH = Path(__file__).resolve().parents[1] / "backend" / "app" / "data" / "tutorials_catalog.json"
OEMBED = "https://www.youtube.com/oembed?format=json&url="


def embed_status(url: str) -> int | None:
    """HTTP status from oEmbed, or None when YouTube could not be reached."""
    try:
        with urllib.request.urlopen(OEMBED + quote(url, safe=""), timeout=10) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code
    except (urllib.error.URLError, TimeoutError):
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="report without writing the catalog")
    args = parser.parse_args()

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    entries = [
        (objective, tutorial)
        for category, objectives in catalog.items()
        if category != "metadata_note" and isinstance(objectives, dict)
        for objective, tutorial in objectives.items()
        if isinstance(tutorial, dict) and tutorial.get("youtube_link")
    ]
    with ThreadPoolExecutor(max_workers=8) as pool:
        statuses = list(pool.map(lambda entry: embed_status(entry[1]["youtube_link"]), entries))

    changed = 0
    for (objective, tutorial), status in zip(entries, statuses):
        if status is None:
            print(f"unreachable  {objective}  {tutorial['youtube_link']}")
            continue
        playable = status == 200
        if not playable:
            print(f"{status} drop  {objective}  {tutorial['youtube_link']}  {tutorial.get('tutorial_title', '')}")
        was_playable = tutorial.get("available") is not False
        if playable != was_playable:
            changed += 1
            if playable:
                tutorial.pop("available", None)
            else:
                tutorial["available"] = False

    print(f"{len(entries)} videos, {sum(status == 200 for status in statuses)} playable, {changed} changed")
    if changed and not args.dry_run:
        CATALOG_PATH.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"updated {CATALOG_PATH}")


if __name__ == "__main__":
    main()
