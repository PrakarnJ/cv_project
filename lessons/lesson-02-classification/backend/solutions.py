"""Reference solutions for lesson-01 exercises.

Imported by `backend/tests.py` as the ground truth. Not served by any
endpoint, so the frontend never sees this file.
"""

from __future__ import annotations

from collections.abc import Sequence

import cv2
import numpy as np


def gaussian_blur(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    k = int(kernel_size)
    if k % 2 == 0:
        k += 1
    kernel_1d = cv2.getGaussianKernel(k, 0)
    kernel_2d = kernel_1d @ kernel_1d.T
    return cv2.filter2D(image, -1, kernel_2d)


def compute_iou(box_a: Sequence[float], box_b: Sequence[float]) -> float:
    ax1, ay1, ax2, ay2 = box_a
    bx1, by1, bx2, by2 = box_b

    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)

    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    if union <= 0:
        return 0.0
    return inter / union
