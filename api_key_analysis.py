from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from music21 import chord, converter, key, roman, stream


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


def clean_common_name(value: str) -> str:
    return value.replace("-", " ")


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


def chord_pitch_names(chord_obj: chord.Chord) -> list[str]:
    return [clean_pitch_name(p.nameWithOctave) for p in chord_obj.pitches]


def chord_figure(chord_obj: chord.Chord) -> str:
    try:
        root = chord_obj.root()
        root_name = clean_pitch_name(root.name) if root else ""
    except Exception:
        root_name = ""

    try:
        quality = chord_obj.quality
    except Exception:
        quality = ""

    suffix = {
        "major": "",
        "minor": "m",
        "diminished": "dim",
        "augmented": "aug",
        "dominant-seventh": "7",
        "major-seventh": "maj7",
        "minor-seventh": "m7",
        "diminished-seventh": "dim7",
        "half-diminished-seventh": "m7♭5",
    }.get(quality, "")

    if root_name:
        return f"{root_name}{suffix}"

    return clean_common_name(chord_obj.pitchedCommonName)


def roman_for_chord(chord_obj: chord.Chord, key_obj: key.Key) -> dict[str, Any]:
    try:
        roman_obj = roman.romanNumeralFromChord(chord_obj, key_obj)
        return {
            "figure": roman_obj.figure,
            "scale_degree": roman_obj.scaleDegree,
            "quality": roman_obj.quality,
        }
    except Exception:
        return {"figure": None, "scale_degree": None, "quality": None}


def analyze_harmony_one(score_payload: ScorePayload) -> dict[str, Any]:
    try:
        parsed = converter.parseData(score_payload.xml, format="musicxml")
        detected_key = parsed.analyze("key")
        chordified = parsed.chordify()
        measures = list(chordified.recurse().getElementsByClass(stream.Measure))
        entries: list[dict[str, Any]] = []
        seen: set[tuple[int, float, str]] = set()

        for fallback_number, measure in enumerate(measures, start=1):
            measure_number = measure.number or fallback_number
            for element in measure.recurse().getElementsByClass(chord.Chord):
                if len(element.pitches) < 2:
                    continue
                figure = chord_figure(element)
                roman_data = roman_for_chord(element, detected_key)
                dedupe_key = (int(measure_number), float(element.offset), figure)
                if dedupe_key in seen:
                    continue
                seen.add(dedupe_key)
                entries.append(
                    {
                        "measure": int(measure_number),
                        "offset": float(element.offset),
                        "figure": figure,
                        "roman": roman_data["figure"],
                        "quality": roman_data["quality"] or getattr(element, "quality", None),
                        "common_name": clean_common_name(element.pitchedCommonName),
                        "pitches": chord_pitch_names(element),
                    }
                )

        progressions = Counter()
        prev_roman = None
        for entry in entries:
            current = entry.get("roman")
            if prev_roman and current:
                progressions[f"{prev_roman} → {current}"] += 1
            if current:
                prev_roman = current

        return {
            "name": score_payload.name,
            "status": "ok",
            "key": serialize_key(detected_key),
            "chords": entries[:300],
            "progressions": [
                {"progression": progression, "count": count}
                for progression, count in progressions.most_common(12)
            ],
            "truncated": len(entries) > 300,
            "total_chords": len(entries),
        }
    except Exception as exc:
        return {
            "name": score_payload.name,
            "status": "error",
            "key": None,
            "chords": [],
            "progressions": [],
            "truncated": False,
            "total_chords": 0,
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


@app.post("/api/analyze-harmony")
def analyze_harmony(payload: AnalyzePayload) -> dict[str, Any]:
    results = [analyze_harmony_one(score) for score in payload.scores]
    ok_results = [r for r in results if r["status"] == "ok"]
    total_chords = sum(int(r.get("total_chords", 0)) for r in ok_results)
    progression_counts = Counter()
    for result in ok_results:
        for item in result.get("progressions", []):
            progression_counts[item["progression"]] += int(item["count"])

    return {
        "results": results,
        "summary": {
            "successful": len(ok_results),
            "failed": len(results) - len(ok_results),
            "total_chords": total_chords,
            "top_progressions": [
                {"progression": progression, "count": count}
                for progression, count in progression_counts.most_common(12)
            ],
        },
    }
