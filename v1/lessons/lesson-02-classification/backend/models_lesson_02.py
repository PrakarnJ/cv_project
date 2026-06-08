"""Lesson-02 model registrations: two ImageNet-pretrained classifiers.

Both share the same `top_k` slider and the same output contract: top-K
predicted class labels + softmax scores, plus a top-1 label overlay drawn
on the original image.

Weights are loaded lazily (first inference, not on import), so
`import models_lesson_02` stays cheap.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np
import torch
from torchvision.models import (
    MobileNet_V3_Small_Weights,
    ResNet18_Weights,
    mobilenet_v3_small,
    resnet18,
)

from shared.device import get_device
from shared.model_registry import register

_TOP_K_SCHEMA = {
    "top_k": {"type": "int", "min": 1, "max": 10, "default": 5},
}

# Module-level cache: weights loaded once per process, not per request.
_CLASSIFIERS: dict[str, tuple[torch.nn.Module, Any, list[str]]] = {}


def _load_classifier(name: str) -> tuple[torch.nn.Module, Any, list[str]]:
    """Return (model, preprocess, categories), loading once per process."""
    if name in _CLASSIFIERS:
        return _CLASSIFIERS[name]

    if name == "resnet18":
        weights = ResNet18_Weights.IMAGENET1K_V1
        model = resnet18(weights=weights)
    elif name == "mobilenetv3":
        weights = MobileNet_V3_Small_Weights.IMAGENET1K_V1
        model = mobilenet_v3_small(weights=weights)
    else:
        raise ValueError(f"Unknown classifier: {name!r}")

    model.eval().to(get_device())
    preprocess = weights.transforms()
    categories = weights.meta["categories"]
    _CLASSIFIERS[name] = (model, preprocess, categories)
    return _CLASSIFIERS[name]


def _classify(image: np.ndarray, params: dict[str, Any], name: str) -> dict[str, Any]:
    """Run an ImageNet classifier and overlay the top-1 label on the image."""
    model, preprocess, categories = _load_classifier(name)
    top_k = max(1, min(10, int(params.get("top_k", 5))))
    device = get_device()

    # OpenCV reads BGR; torchvision transforms expect RGB.
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB) if image.ndim == 3 else image
    chw_uint8 = torch.from_numpy(rgb).permute(2, 0, 1)  # CHW uint8
    batch = preprocess(chw_uint8).unsqueeze(0).to(device)

    with torch.inference_mode():
        logits = model(batch)
        probs = torch.nn.functional.softmax(logits[0], dim=0)
        scores, indices = torch.topk(probs, top_k)

    detections = [
        {"label": categories[int(i)], "score": float(s)}
        for s, i in zip(scores.tolist(), indices.tolist(), strict=True)
    ]

    # Overlay the top-1 prediction; the frontend renders the full top-K
    # from the `detections` list separately.
    annotated = image.copy()
    if detections:
        top = detections[0]
        text = f"{top['label']} ({top['score']:.2f})"
        cv2.putText(
            annotated,
            text,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 0),
            2,
            cv2.LINE_AA,
        )
    return {"image": annotated, "detections": detections}


@register(
    name="resnet18_imagenet",
    display_name="ResNet-18 (ImageNet)",
    param_schema=_TOP_K_SCHEMA,
)
def resnet18_imagenet(image: np.ndarray, params: dict[str, Any]) -> dict[str, Any]:
    return _classify(image, params, "resnet18")


@register(
    name="mobilenetv3_imagenet",
    display_name="MobileNet V3 Small (ImageNet)",
    param_schema=_TOP_K_SCHEMA,
)
def mobilenetv3_imagenet(image: np.ndarray, params: dict[str, Any]) -> dict[str, Any]:
    return _classify(image, params, "mobilenetv3")
