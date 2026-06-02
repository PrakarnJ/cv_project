from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable

InferFn = Callable[[Any, dict[str, Any]], dict[str, Any]]


@dataclass
class ModelEntry:
    name: str
    display_name: str
    param_schema: dict[str, Any]
    infer_fn: InferFn


REGISTRY: dict[str, ModelEntry] = {}


def register(
    name: str,
    display_name: str,
    param_schema: dict[str, Any],
) -> Callable[[InferFn], InferFn]:
    """Decorator: register an inference function under `name` in REGISTRY."""

    def decorator(fn: InferFn) -> InferFn:
        REGISTRY[name] = ModelEntry(name, display_name, param_schema, fn)
        return fn

    return decorator
