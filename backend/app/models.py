"""Mirrors frontend/src/types/checkin.ts — keep in sync."""
from typing import Literal
from pydantic import BaseModel


class Flag(BaseModel):
    metric: str
    direction: Literal["up", "down"]
    zScore: float


class CheckIn(BaseModel):
    id: str
    userId: str
    createdAt: str
    sitToStandSec: float
    repsDetected: int
    wpm: float
    avgPauseMs: float
    wordCount: int
    transcript: str
    language: str
    flags: list[Flag] = []
    summaryParent: str = ""
    summaryFamily: str = ""


class FallAlert(BaseModel):
    userId: str
    detectedAt: str
    respondedOk: bool
    secondsDown: float
