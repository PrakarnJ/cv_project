"""Reference solutions for lesson-02 exercises.

Imported by `backend/tests.py` as the ground truth (and surfaced by the
"Show solution" endpoint). Not served by any frontend route otherwise.
"""

from __future__ import annotations

import cv2
import numpy as np
import torch

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_for_imagenet(image: np.ndarray) -> torch.Tensor:
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]
    scale = 256 / min(h, w)
    new_h, new_w = int(round(h * scale)), int(round(w * scale))
    resized = cv2.resize(rgb, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    top = (new_h - 224) // 2
    left = (new_w - 224) // 2
    cropped = resized[top : top + 224, left : left + 224]

    arr = cropped.astype(np.float32) / 255.0
    normalized = (arr - IMAGENET_MEAN) / IMAGENET_STD
    chw = np.transpose(normalized, (2, 0, 1))
    return torch.from_numpy(chw).unsqueeze(0)


def top_k_accuracy(logits: np.ndarray, labels: np.ndarray, k: int = 1) -> float:
    logits = np.asarray(logits)
    labels = np.asarray(labels)
    top_k_idx = np.argsort(-logits, axis=1)[:, :k]
    correct = (top_k_idx == labels[:, None]).any(axis=1)
    return float(correct.mean())
