from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from shared.model_registry import register


@register(
    name="opencv_blur",
    display_name="OpenCV Gaussian Blur",
    param_schema={
        "kernel_size": {"type": "int", "min": 1, "max": 31, "default": 5},
    },
)
def opencv_blur(image: np.ndarray, params: dict[str, Any]) -> dict[str, Any]:
    k = int(params["kernel_size"])
    if k % 2 == 0:
        k += 1
    blurred = cv2.GaussianBlur(image, (k, k), 0)
    return {"image": blurred, "detections": []}


@register(
    name="opencv_edge",
    display_name="OpenCV Canny Edges",
    param_schema={
        "low_threshold": {"type": "int", "min": 0, "max": 255, "default": 50},
        "high_threshold": {"type": "int", "min": 0, "max": 255, "default": 150},
    },
)
def opencv_edge(image: np.ndarray, params: dict[str, Any]) -> dict[str, Any]:
    low = int(params["low_threshold"])
    high = int(params["high_threshold"])
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    edges = cv2.Canny(gray, low, high)
    edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
    return {"image": edges_bgr, "detections": []}
