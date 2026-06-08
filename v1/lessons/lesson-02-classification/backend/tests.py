"""Tests for lesson-02 exercises.

Each test loads a user submission written by the test-runner endpoint to
`backend/.work/exercise_{slug}.py` and exercises its public API. The file
name encodes which exercise the submission belongs to.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path
from types import ModuleType

import numpy as np
import pytest
import torch

WORK_DIR = Path(__file__).resolve().parent / ".work"


def _load_submission(slug: str) -> ModuleType:
    path = WORK_DIR / f"exercise_{slug}.py"
    if not path.is_file():
        pytest.fail(f"No submission found at {path}")
    spec = importlib.util.spec_from_file_location(f"submission_{slug}", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def ex1() -> ModuleType:
    return _load_submission("ex1")


@pytest.fixture
def ex2() -> ModuleType:
    return _load_submission("ex2")


# -- Exercise 1: preprocess_for_imagenet -----------------------------------


def test_preprocess_for_imagenet_shape(ex1: ModuleType) -> None:
    rng = np.random.default_rng(0)
    img = (rng.random((300, 500, 3)) * 255).astype(np.uint8)
    out = ex1.preprocess_for_imagenet(img)
    assert isinstance(out, torch.Tensor), f"expected torch.Tensor, got {type(out)}"
    assert out.shape == (1, 3, 224, 224), f"bad shape: {tuple(out.shape)}"
    assert out.dtype == torch.float32, f"bad dtype: {out.dtype}"


def test_preprocess_for_imagenet_normalization(ex1: ModuleType) -> None:
    # A flat mid-gray image should normalize to roughly the negative
    # mean/std (with the gray value of 0.5 dominating). Importantly the
    # output must NOT be raw uint8 — that's the trap a no-op fails.
    img = np.full((224, 224, 3), 128, dtype=np.uint8)
    out = ex1.preprocess_for_imagenet(img)
    assert torch.isfinite(out).all(), "non-finite values in output"
    # Mid-gray (0.5) minus ImageNet mean ~0.45 divided by std ~0.22 -> ~0.2.
    # Just check we're in the standardized range, NOT uint8.
    assert out.abs().max() < 5.0, f"values look unnormalized: max={out.abs().max()}"
    assert out.abs().max() > 0.05, f"values look zeroed/raw: max={out.abs().max()}"


# -- Exercise 2: top_k_accuracy --------------------------------------------


def test_top_k_accuracy_k1(ex2: ModuleType) -> None:
    logits = np.array([[1, 2, 3], [3, 2, 1]])
    labels = np.array([2, 2])
    assert ex2.top_k_accuracy(logits, labels, k=1) == pytest.approx(0.5)


def test_top_k_accuracy_k2_unchanged(ex2: ModuleType) -> None:
    # In the second row, true label 2 has score 1, which is 3rd of 3.
    # Top-2 doesn't help — still only the first sample is correct.
    logits = np.array([[1, 2, 3], [3, 2, 1]])
    labels = np.array([2, 2])
    assert ex2.top_k_accuracy(logits, labels, k=2) == pytest.approx(0.5)


def test_top_k_accuracy_k_equals_classes(ex2: ModuleType) -> None:
    logits = np.array([[1, 2, 3], [3, 2, 1]])
    labels = np.array([2, 2])
    assert ex2.top_k_accuracy(logits, labels, k=3) == pytest.approx(1.0)
