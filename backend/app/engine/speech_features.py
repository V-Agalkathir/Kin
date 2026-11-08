"""Speech features from a word-level transcript: [(word, start_s, end_s), ...]."""

PAUSE_MIN_S = 0.25  # gaps shorter than this are normal articulation, not pauses


def speech_features(words: list[tuple[str, float, float]]) -> dict:
    if not words:
        return {"wpm": 0.0, "avgPauseMs": 0.0, "wordCount": 0}
    duration = words[-1][2] - words[0][1]
    gaps = [b[1] - a[2] for a, b in zip(words, words[1:])]
    pauses = [g for g in gaps if g >= PAUSE_MIN_S]
    return {
        "wpm": round(len(words) / duration * 60, 1) if duration > 0 else 0.0,
        "avgPauseMs": round(sum(pauses) / len(pauses) * 1000, 1) if pauses else 0.0,
        "wordCount": len(words),
    }
