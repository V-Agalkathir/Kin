"""Baseline + flag math. Pure functions — tested in tests/test_baseline.py."""
from statistics import median

WINDOW = 14
MIN_HISTORY = 5
Z_THRESHOLD = 2.0
MAD_SCALE = 1.4826  # makes MAD comparable to std dev for normal data


def robust_z(value: float, history: list[float]) -> float | None:
    """Robust z-score of value vs the last WINDOW points of history. None if not enough history."""
    window = history[-WINDOW:]
    if len(window) < MIN_HISTORY:
        return None
    med = median(window)
    mad = median(abs(x - med) for x in window) * MAD_SCALE
    if mad == 0:
        return 0.0
    return (value - med) / mad


def should_flag(z_now: float | None, z_prev: float | None) -> bool:
    """Flag only when two consecutive check-ins are past the threshold in the same direction."""
    if z_now is None or z_prev is None:
        return False
    return abs(z_now) > Z_THRESHOLD and abs(z_prev) > Z_THRESHOLD and (z_now > 0) == (z_prev > 0)
