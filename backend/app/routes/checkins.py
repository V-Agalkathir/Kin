import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, UploadFile

from app.engine.baseline import robust_z, should_flag
from app.engine.speech_features import speech_features
from app.models import CheckIn, Flag
from app.services.summarize import summarize
from app.services.transcribe import transcribe

router = APIRouter()

# In-memory store for Phase 1. TODO(B): replace with Supabase in Phase 2.
DB: dict[str, list[CheckIn]] = {}
METRICS = ["sitToStandSec", "wpm", "avgPauseMs"]


@router.post("/checkins", response_model=CheckIn)
async def create_checkin(
    audio: UploadFile = File(...),
    sitToStandSec: float = Form(...),
    repsDetected: int = Form(...),
    userId: str = Form(...),
    language: str = Form("en"),
):
    text, words = transcribe(await audio.read(), language)
    feats = speech_features(words)
    history = DB.setdefault(userId, [])

    current = {"sitToStandSec": sitToStandSec, **feats}
    flags: list[Flag] = []
    for m in METRICS:
        series = [getattr(c, m) for c in history]
        z_now = robust_z(current[m], series)
        z_prev = robust_z(series[-1], series[:-1]) if series else None
        if should_flag(z_now, z_prev):
            flags.append(Flag(metric=m, direction="up" if z_now > 0 else "down", zScore=round(z_now, 2)))

    summaries = summarize(current, [f.model_dump() for f in flags], language)
    checkin = CheckIn(
        id=str(uuid.uuid4()), userId=userId, createdAt=datetime.now(timezone.utc).isoformat(),
        sitToStandSec=sitToStandSec, repsDetected=repsDetected, transcript=text, language=language,
        flags=flags, **feats, **summaries,
    )
    history.append(checkin)
    return checkin


@router.get("/checkins", response_model=list[CheckIn])
def list_checkins(userId: str):
    return DB.get(userId, [])
