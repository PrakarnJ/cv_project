"""Exercise 2 (write from scratch): compute IoU between two boxes.

Implement `compute_iou` from scratch. The function body is empty; the
docstring states the expected behaviour and a few worked test cases.
"""

from __future__ import annotations

from collections.abc import Sequence


def compute_iou(box_a: Sequence[float], box_b: Sequence[float]) -> float:
    """Intersection over Union of two axis-aligned bounding boxes.

    Each box is a sequence (x1, y1, x2, y2) where (x1, y1) is the
    top-left corner and (x2, y2) is the bottom-right corner.

    Returns:
        IoU as a float in [0, 1]. Return 0.0 if the boxes do not overlap.

    Examples:
        compute_iou((0, 0, 10, 10), (0,  0, 10, 10))   ->  1.0      # identical
        compute_iou((0, 0, 10, 10), (20, 20, 30, 30))  ->  0.0      # disjoint
        compute_iou((0, 0, 10, 10), (5,  5, 15, 15))   ->  25/175   # partial
    """
    raise NotImplementedError("Implement compute_iou here.")
