from __future__ import annotations

import asyncio
import inspect
import json
import subprocess
import sys
import time
import uuid
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sse_starlette.sse import EventSourceResponse

from shared.model_registry import REGISTRY
from shared.progress import read_progress, update_progress
from shared.utils import decode_image, draw_detections, encode_image

from . import models_lesson_02  # noqa: F401  (import for side effect: registers models)
from . import solutions

LESSON_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = LESSON_ROOT.parent.parent
CONFIG_PATH = LESSON_ROOT / "lesson.config.json"
TUTORIAL_PATH = LESSON_ROOT / "README.md"
TMP_DIR = Path("/tmp/cv-learning")
WORK_DIR = LESSON_ROOT / "backend" / ".work"
TESTS_PATH = LESSON_ROOT / "backend" / "tests.py"
EXERCISE_TIMEOUT_S = 30

# Maps exercise IDs to the reference function in backend/solutions.py
# that Show Solution should reveal.
EXERCISE_SOLUTIONS: dict[str, str] = {
    "ex1": "preprocess_for_imagenet",
    "ex2": "top_k_accuracy",
}


class LessonResponse(BaseModel):
    id: str
    title: str
    subtitle: str
    estimated_minutes: int
    exercises: list[dict[str, Any]]
    self_checks_global: list[str]


class TutorialResponse(BaseModel):
    content: str


class HealthResponse(BaseModel):
    status: str


class ModelInfo(BaseModel):
    name: str
    display_name: str
    param_schema: dict[str, Any]


class InferRequest(BaseModel):
    # Pydantic v2 reserves the `model_` prefix; opt out so model_name passes through.
    model_config = ConfigDict(protected_namespaces=())

    model_name: str
    params: dict[str, Any]
    image_base64: str


class InferResponse(BaseModel):
    annotated_image_base64: str
    detections: list[dict[str, Any]]
    inference_ms: float
    model: str


class ExerciseDetailResponse(BaseModel):
    id: str
    type: str
    title: str
    starter_code: str = ""
    starter_file: str | None = None
    test_target: str | None = None
    playground_model: str | None = None
    self_checks: list[str] | None = None
    hints: list[str] | None = None


class ExerciseRunRequest(BaseModel):
    code: str


class ExerciseRunResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: float


class ProgressPayload(BaseModel):
    lessons: dict[str, Any]


class SolutionResponse(BaseModel):
    code: str


app = FastAPI(title="cv-learning lesson-02")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/lesson", response_model=LessonResponse)
def get_lesson() -> LessonResponse:
    data: dict[str, Any] = json.loads(CONFIG_PATH.read_text())
    return LessonResponse(**data)


@app.get("/tutorial", response_model=TutorialResponse)
def get_tutorial() -> TutorialResponse:
    return TutorialResponse(content=TUTORIAL_PATH.read_text())


@app.get("/models", response_model=list[ModelInfo])
def get_models() -> list[ModelInfo]:
    return [
        ModelInfo(name=e.name, display_name=e.display_name, param_schema=e.param_schema)
        for e in REGISTRY.values()
    ]


@app.post("/playground/infer", response_model=InferResponse)
def playground_infer(req: InferRequest) -> InferResponse:
    if req.model_name not in REGISTRY:
        raise HTTPException(
            status_code=404, detail=f"Unknown model: {req.model_name!r}"
        )
    try:
        image = decode_image(req.image_base64)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    entry = REGISTRY[req.model_name]
    t0 = time.perf_counter()
    out = entry.infer_fn(image, req.params)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    annotated = out["image"]
    detections: list[dict[str, Any]] = out.get("detections", [])
    if detections:
        annotated = draw_detections(annotated, detections)

    return InferResponse(
        annotated_image_base64=encode_image(annotated),
        detections=detections,
        inference_ms=elapsed_ms,
        model=req.model_name,
    )


@app.get("/exercises", response_model=list[dict[str, Any]])
def get_exercises() -> list[dict[str, Any]]:
    data: dict[str, Any] = json.loads(CONFIG_PATH.read_text())
    return data["exercises"]


@app.get(
    "/exercises/{exercise_id}",
    response_model=ExerciseDetailResponse,
    response_model_exclude_none=True,
)
def get_exercise(exercise_id: str) -> ExerciseDetailResponse:
    data: dict[str, Any] = json.loads(CONFIG_PATH.read_text())
    found = next((e for e in data["exercises"] if e["id"] == exercise_id), None)
    if found is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown exercise: {exercise_id!r}"
        )

    starter_file = found.get("starter_file")
    if starter_file:
        starter_path = LESSON_ROOT / starter_file
        if not starter_path.is_file():
            raise HTTPException(
                status_code=500,
                detail=f"Starter file missing on disk: {starter_file}",
            )
        starter_code = starter_path.read_text()
    else:
        starter_code = ""

    return ExerciseDetailResponse(starter_code=starter_code, **found)


@app.post("/exercises/{exercise_id}/run", response_model=ExerciseRunResponse)
def run_exercise(exercise_id: str, req: ExerciseRunRequest) -> ExerciseRunResponse:
    data: dict[str, Any] = json.loads(CONFIG_PATH.read_text())
    if not any(e["id"] == exercise_id for e in data["exercises"]):
        raise HTTPException(
            status_code=404, detail=f"Unknown exercise: {exercise_id!r}"
        )

    TMP_DIR.mkdir(parents=True, exist_ok=True)
    tmpfile = TMP_DIR / f"exercise-{exercise_id}-{uuid.uuid4().hex}.py"
    tmpfile.write_text(req.code)

    t0 = time.perf_counter()
    try:
        proc = subprocess.run(
            [sys.executable, str(tmpfile)],
            timeout=EXERCISE_TIMEOUT_S,
            capture_output=True,
            text=True,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return ExerciseRunResponse(
            stdout=proc.stdout,
            stderr=proc.stderr,
            exit_code=proc.returncode,
            duration_ms=elapsed_ms,
        )
    except subprocess.TimeoutExpired as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return ExerciseRunResponse(
            stdout=e.stdout or "",
            stderr=(e.stderr or "")
            + f"\n[Timeout: code exceeded {EXERCISE_TIMEOUT_S}s and was killed]",
            exit_code=-1,
            duration_ms=elapsed_ms,
        )
    finally:
        try:
            tmpfile.unlink()
        except OSError:
            pass


async def _stream_pytest(cmd: list[str], cwd: str) -> AsyncIterator[dict[str, str]]:
    """Run pytest as a subprocess; yield each stdout line as an SSE event,
    then a final 'done' event with parsed passed/failed test names."""
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=cwd,
    )
    passed: list[str] = []
    failed: list[str] = []
    assert proc.stdout is not None
    while True:
        chunk = await proc.stdout.readline()
        if not chunk:
            break
        line = chunk.decode("utf-8", errors="replace").rstrip("\n")
        yield {"event": "line", "data": line}
        # pytest -v lines look like "path::test_name PASSED [ 50%]"
        if "::" in line and " PASSED" in line:
            passed.append(line.split("::")[-1].split(" ")[0])
        elif "::" in line and " FAILED" in line:
            failed.append(line.split("::")[-1].split(" ")[0])

    await proc.wait()
    yield {
        "event": "done",
        "data": json.dumps(
            {
                "passed": passed,
                "failed": failed,
                "exit_code": proc.returncode,
            }
        ),
    }


@app.post("/exercises/{exercise_id}/test")
async def test_exercise(
    exercise_id: str, req: ExerciseRunRequest
) -> EventSourceResponse:
    data: dict[str, Any] = json.loads(CONFIG_PATH.read_text())
    found = next((e for e in data["exercises"] if e["id"] == exercise_id), None)
    if found is None:
        raise HTTPException(
            status_code=404, detail=f"Unknown exercise: {exercise_id!r}"
        )
    test_target = found.get("test_target")
    if not test_target:
        raise HTTPException(
            status_code=400,
            detail=f"Exercise {exercise_id!r} has no test_target (not a code exercise)",
        )

    WORK_DIR.mkdir(parents=True, exist_ok=True)
    submission_path = WORK_DIR / f"exercise_{exercise_id}.py"
    submission_path.write_text(req.code)

    cmd = [
        sys.executable,
        "-m",
        "pytest",
        str(TESTS_PATH),
        "-k",
        test_target,
        "-v",
        "--tb=short",
        "--no-header",
        "--color=no",
    ]
    return EventSourceResponse(_stream_pytest(cmd, str(REPO_ROOT)))


@app.get("/exercises/{exercise_id}/solution", response_model=SolutionResponse)
def get_exercise_solution(exercise_id: str) -> SolutionResponse:
    func_name = EXERCISE_SOLUTIONS.get(exercise_id)
    if func_name is None:
        raise HTTPException(
            status_code=404, detail=f"No solution for exercise {exercise_id!r}"
        )
    fn = getattr(solutions, func_name, None)
    if fn is None:
        raise HTTPException(
            status_code=500,
            detail=f"Solution function {func_name!r} not found in solutions.py",
        )
    return SolutionResponse(code=inspect.getsource(fn))


@app.get("/progress", response_model=ProgressPayload)
def get_progress() -> ProgressPayload:
    return ProgressPayload(**read_progress())


@app.post("/progress", response_model=ProgressPayload)
def post_progress(req: ProgressPayload) -> ProgressPayload:
    merged = update_progress(req.model_dump())
    return ProgressPayload(**merged)
