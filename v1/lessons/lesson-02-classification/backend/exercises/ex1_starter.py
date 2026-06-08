"""Exercise 1 (fill-in-the-blank): preprocess an image for ImageNet models.

Every torchvision ImageNet model expects the same input pipeline. Build it
by hand here so you understand what `weights.transforms()` actually does
under the hood. Fill in the two `...` placeholders below.
"""

from __future__ import annotations

import cv2
import numpy as np
import torch

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_for_imagenet(image: np.ndarray) -> torch.Tensor:
    """Convert a BGR uint8 image into an ImageNet-ready batch tensor.

    Args:
        image: BGR uint8 ndarray of shape (H, W, 3). Any H, W >= 1 is OK.

    Returns:
        Float32 tensor of shape (1, 3, 224, 224), with ImageNet
        mean/std applied. RGB channel order (not BGR).
    """
    # OpenCV is BGR; ImageNet models expect RGB.
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]

    # TODO 1: resize so the SHORTER side is 256 px (keep aspect ratio),
    # then center-crop the result to exactly 224 x 224.
    # Hint: scale = 256 / min(h, w); cv2.resize(rgb, (new_w, new_h)).
    # Center-crop: top = (new_h - 224) // 2; left = (new_w - 224) // 2.
    cropped = ...

    # TODO 2: convert HWC uint8 [0, 255] to CHW float32 [0, 1], apply
    # the ImageNet mean/std normalization, and add a batch dimension.
    # Final shape must be (1, 3, 224, 224), dtype float32.
    # Use IMAGENET_MEAN and IMAGENET_STD defined above.
    tensor = ...

    return tensor
