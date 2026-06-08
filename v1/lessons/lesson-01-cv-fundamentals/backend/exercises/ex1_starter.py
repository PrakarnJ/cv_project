"""Exercise 1 (fill-in-the-blank): implement Gaussian blur.

Build a 2-D Gaussian kernel of the requested size and convolve it with the
input image. Fill in the two `...` placeholders below.
"""

from __future__ import annotations

import cv2
import numpy as np


def gaussian_blur(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """Return a Gaussian-blurred copy of `image`.

    Args:
        image: BGR uint8 ndarray of shape (H, W, 3).
        kernel_size: odd integer in [1, 31]. If even, it will be bumped to
            the next odd value because cv2 requires odd kernels.

    Returns:
        Blurred image with the same shape and dtype as `image`.
    """
    k = int(kernel_size)
    if k % 2 == 0:
        k += 1

    # TODO 1: build a 2-D Gaussian kernel of shape (k, k).
    # Hint: `cv2.getGaussianKernel(k, 0)` returns a (k, 1) 1-D kernel that
    # sums to 1. The outer product of that vector with its own transpose
    # gives you a 2-D kernel that also sums to 1.
    kernel = ...

    # TODO 2: convolve `image` with `kernel` using `cv2.filter2D`.
    # Pass `ddepth=-1` so the output dtype matches the input.
    blurred = ...

    return blurred
