"""Tests for lesson-01 exercises.

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


# -- Exercise 1: gaussian_blur --------------------------------------------


def test_gaussian_blur_shape(ex1: ModuleType) -> None:
    rng = np.random.default_rng(0)
    img = (rng.random((32, 32, 3)) * 255).astype(np.uint8)
    out = ex1.gaussian_blur(img, 5)
    assert out.shape == img.shape, f"shape changed: {out.shape} != {img.shape}"
    assert out.dtype == np.uint8, f"dtype changed: {out.dtype} != uint8"


def test_gaussian_blur_blurred(ex1: ModuleType) -> None:
    # A small bright spot on a dark background must be smeared and dimmed
    # by a real Gaussian blur. A no-op implementation will fail this.
    img = np.zeros((32, 32, 3), dtype=np.uint8)
    img[15:18, 15:18] = 255
    out = ex1.gaussian_blur(img, 9)
    assert not np.array_equal(out, img), "blur produced identical output"
    assert out.max() < img.max(), f"peak brightness not reduced: max={out.max()}"


# -- Exercise 2: sharpen --------------------------------------------------


def test_sharpen_shape(ex2: ModuleType) -> None:
    rng = np.random.default_rng(0)
    img = (rng.random((32, 32, 3)) * 255).astype(np.uint8)
    out = ex2.sharpen(img)
    assert out.shape == img.shape, f"shape changed: {out.shape} != {img.shape}"
    assert out.dtype == np.uint8, f"dtype changed: {out.dtype} != uint8"


def test_sharpen_uniform_preserved(ex2: ModuleType) -> None:
    # A sharpen kernel sums to 1, so a flat region must keep its brightness.
    img = np.full((16, 16, 3), 100, dtype=np.uint8)
    out = ex2.sharpen(img)
    assert np.array_equal(out, img), "uniform image changed under sharpen"


def test_sharpen_enhances_peak(ex2: ModuleType) -> None:
    # A small bright spot on a mid-grey background must be pushed brighter by a
    # real sharpen. Modest values keep the result inside uint8 (no clipping).
    # A no-op implementation will fail this.
    img = np.full((32, 32, 3), 100, dtype=np.uint8)
    img[15:17, 15:17] = 120
    out = ex2.sharpen(img)
    assert out.max() > img.max(), f"peak not enhanced: max={out.max()} <= {img.max()}"
