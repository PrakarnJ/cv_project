"""Exercise 2 (write from scratch): compute top-K accuracy.

Implement `top_k_accuracy` from scratch. The function body is empty; the
docstring states the expected behaviour and worked test cases.
"""

from __future__ import annotations

import numpy as np


def top_k_accuracy(logits: np.ndarray, labels: np.ndarray, k: int = 1) -> float:
    """Fraction of samples whose true label is in the model's top-K.

    Args:
        logits: ndarray of shape (N, C) — raw scores (or probabilities).
        labels: ndarray of shape (N,) — true class indices in [0, C).
        k: number of top predictions per sample to consider correct.
           Must satisfy 1 <= k <= C.

    Returns:
        Accuracy as a float in [0.0, 1.0].

    Examples:
        # Two samples, 3 classes, true labels = [2, 2].
        logits = np.array([[1, 2, 3],
                           [3, 2, 1]])
        top_k_accuracy(logits, np.array([2, 2]), k=1)  ->  0.5   # only first
        top_k_accuracy(logits, np.array([2, 2]), k=2)  ->  0.5   # still only first
        top_k_accuracy(logits, np.array([2, 2]), k=3)  ->  1.0   # both correct
    """
    raise NotImplementedError("Implement top_k_accuracy here.")
