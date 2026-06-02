"""Read / write the per-machine progress JSON file.

The file lives at `shared/progress.json` (gitignored). Reads are tolerant
of a missing file. Writes are atomic via the tmp-file + rename pattern.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

PROGRESS_PATH = Path(__file__).resolve().parent / "progress.json"


def _default() -> dict[str, Any]:
    return {"lessons": {}}


def read_progress() -> dict[str, Any]:
    """Return the current progress dict, or the empty default if no file yet."""
    if not PROGRESS_PATH.is_file():
        return _default()
    return json.loads(PROGRESS_PATH.read_text())


def deep_merge(base: dict[str, Any], update: dict[str, Any]) -> dict[str, Any]:
    """Recursively merge `update` into `base`; lists and scalars in `update` replace."""
    result = dict(base)
    for key, value in update.items():
        existing = result.get(key)
        if isinstance(value, dict) and isinstance(existing, dict):
            result[key] = deep_merge(existing, value)
        else:
            result[key] = value
    return result


def write_progress_atomic(progress: dict[str, Any]) -> None:
    """Serialize `progress` and write it to `progress.json` atomically."""
    PROGRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(progress, indent=2)
    fd, tmp_path = tempfile.mkstemp(
        prefix="progress-", suffix=".tmp.json", dir=PROGRESS_PATH.parent
    )
    try:
        with os.fdopen(fd, "w") as f:
            f.write(payload)
        os.replace(tmp_path, PROGRESS_PATH)
    except Exception:
        Path(tmp_path).unlink(missing_ok=True)
        raise


def update_progress(update: dict[str, Any]) -> dict[str, Any]:
    """Deep-merge `update` into the current file and return the new state."""
    merged = deep_merge(read_progress(), update)
    write_progress_atomic(merged)
    return merged
