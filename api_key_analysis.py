from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from music21 import converter, key


class ScorePayload(BaseModel):
    name: str = "score.musicxml"
    xml: str = Field(min_length=1)


class AnalyzePayload(BaseModel):
    scores: list[ScorePayload] = Field(min_length=1)


app = FastAPI(title="Score Designer music21 API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def clean_pitch_name(value: str) -> str:
    return value.replace("-", "♭")


def mode_label(mode: str | None) -> str:
    return {"major": "장조", "minor": "단조"}.get(mode or "", mode or "")


def serialize_key(key_obj: Any) -> dict[str, Any]:
    mode = getattr(key_obj, "mode", None)
    tonic = clean_pitch_name(getattr(getattr(key_obj, "tonic", None), "name", str(key_obj)))
    label = f"{tonic} {mode}".strip()
    label_ko = f"{tonic} {mode_label(mode)}".strip()

    correlation = getattr(key_obj, "correlationCoefficient", None)
    try:
        correlation = None if correlation is None else float(correlation)
    except (TypeError, ValueError):
        correlation = None

    try:
        tonal_certainty = float(key_obj.tonalCertainty())
    except Exception:
        tonal_certainty = None

    return {
        "label": label,
        "label_ko": label_ko,
        "tonic": tonic,
        "mode": mode,
        "correlation": correlation,
        "tonal_certainty": tonal_certainty,
    }


def serialize_written_key(score: Any) -> dict[str, Any] | None:
    signatures = list(score.recurse().getElementsByClass(key.KeySignature))
    if not signatures:
        return None

    fifths = int(signatures[0].sharps)
    signature = key.KeySignature(fifths)
    major = serialize_key(signature.asKey("major"))
    minor = serialize_key(signature.asKey("minor"))
    return {
        "fifths": fifths,
        "label": f"{major['label_ko']} / {minor['label_ko']}",
        "major": major,
        "minor": minor,
    }


def analyze_one(score_payload: ScorePayload) -> dict[str, Any]:
    try:
        parsed = converter.parseData(score_payload.xml, format="musicxml")
        detected = parsed.analyze("key")
        alternates = [
            serialize_key(alt)
            for alt in getattr(detected, "alternateInterpretations", [])[:5]
        ]
        return {
            "name": score_payload.name,
            "status": "ok",
            "detected_key": serialize_key(detected),
            "written_key": serialize_written_key(parsed),
            "alternates": alternates,
        }
    except Exception as exc:
        return {
            "name": score_payload.name,
            "status": "error",
            "detected_key": None,
            "written_key": None,
            "alternates": [],
            "error": str(exc),
        }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze-key")
def analyze_key(payload: AnalyzePayload) -> dict[str, Any]:
    results = [analyze_one(score) for score in payload.scores]
    ok_results = [r for r in results if r["status"] == "ok" and r["detected_key"]]
    counts = Counter(r["detected_key"]["label_ko"] for r in ok_results)
    top_key = counts.most_common(1)[0][0] if counts else None

    return {
        "results": results,
        "summary": {
            "successful": len(ok_results),
            "failed": len(results) - len(ok_results),
            "top_key": top_key,
            "key_counts": dict(counts),
        },
    }
