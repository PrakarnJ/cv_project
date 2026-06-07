"""Exercise 2 (write from scratch): sharpen an image with a convolution.

You implemented a *blur* in exercise 1 by convolving with an all-positive
Gaussian kernel. A *sharpen* uses a kernel with a positive centre and negative
neighbours, which boosts local contrast at edges. Implement `sharpen` from
scratch — the function body is empty.
"""

from __future__ import annotations

import cv2
import numpy as np


def sharpen(image: np.ndarray) -> np.ndarray:
    """Return a sharpened copy of `image`.

    Sharpening convolves the image with a small kernel whose centre weight is
    positive and whose neighbour weights are negative. A common choice is the
    3x3 kernel::

        [[ 0, -1,  0],
         [-1,  5, -1],
         [-1 is a neighbour weight; the centre is 5]
         [ 0, -1,  0]]

    The weights sum to 1, so a flat (uniform) region keeps its brightness while
    pixels near an edge are pushed further apart — making the edge "pop".

    Args:
        image: BGR uint8 ndarray of shape (H, W, 3).

    Returns:
        Sharpened image with the same shape and dtype as `image`.
    """
    raise NotImplementedError("Implement sharpen here.")
