from __future__ import annotations

import base64
from typing import Any

import cv2
import numpy as np


def decode_image(image_b64: str) -> np.ndarray:
    """Decode base64 (raw or data URL) into a BGR uint8 ndarray."""
    if image_b64.startswith("data:"):
        _, _, payload = image_b64.partition(",")
    else:
        payload = image_b64
    raw = base64.b64decode(payload)
    buf = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("decode_image: payload is not a valid PNG/JPEG")
    return image


def encode_image(image: np.ndarray, fmt: str = ".png") -> str:
    """Encode a BGR ndarray as base64 (no data URL prefix)."""
    ok, buf = cv2.imencode(fmt, image)
    if not ok:
        raise RuntimeError(f"encode_image: cv2.imencode failed for format {fmt!r}")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def draw_detections(image: np.ndarray, detections: list[dict[str, Any]]) -> np.ndarray:
    """Draw bbox + label/score overlays on a copy of the image."""
    annotated = image.copy()
    for det in detections:
        bbox = det.get("bbox")
        if bbox is None:
            continue
        x1, y1, x2, y2 = (int(v) for v in bbox)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        label = det.get("label")
        score = det.get("score")
        if label is None and score is None:
            continue
        parts: list[str] = []
        if label is not None:
            parts.append(str(label))
        if score is not None:
            parts.append(f"{float(score):.2f}")
        text = " ".join(parts)
        cv2.putText(
            annotated,
            text,
            (x1, max(0, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 0),
            1,
            cv2.LINE_AA,
        )
    return annotated
