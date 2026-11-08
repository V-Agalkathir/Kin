"""Whisper transcription. Audio file is deleted right after. TODO(B): swap to faster-whisper locally if needed."""
import os
import tempfile

from openai import OpenAI


def transcribe(audio_bytes: bytes, language: str) -> tuple[str, list[tuple[str, float, float]]]:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(audio_bytes)
        path = f.name
    try:
        with open(path, "rb") as fh:
            res = client.audio.transcriptions.create(
                model="whisper-1", file=fh, language=language.split("-")[0],
                response_format="verbose_json", timestamp_granularities=["word"],
            )
        words = [(w.word, w.start, w.end) for w in (res.words or [])]
        return res.text, words
    finally:
        os.remove(path)
