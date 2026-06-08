"""Reference solutions for lesson-01 exercises.

Imported by `backend/tests.py` as the ground truth. Not served by any
endpoint, so the frontend never sees this file.
"""

from __future__ import annotations

import cv2
import numpy as np


def gaussian_blur(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    k = int(kernel_size)
    if k % 2 == 0:
        k += 1
    kernel_1d = cv2.getGaussianKernel(k, 0)
    kernel_2d = kernel_1d @ kernel_1d.T
    return cv2.filter2D(image, -1, kernel_2d)


def sharpen(image: np.ndarray) -> np.ndarray:
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    return cv2.filter2D(image, -1, kernel)  # kernel sums to 1 -> brightness preserved
