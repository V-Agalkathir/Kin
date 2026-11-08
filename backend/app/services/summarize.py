"""One LLM call per check-in → parent-language summary + English family summary.
Only numbers + flags go in — never audio. TODO(B): wire up your chosen LLM provider."""

SYSTEM_PROMPT = """You write short, calm check-in summaries for an older adult and their family.
Never diagnose or use medical terms. Mention a doctor only if a change has lasted several check-ins.
Return JSON: {"summaryParent": "<2 sentences in LANG>", "summaryFamily": "<2-3 sentences in English>"}."""


def summarize(metrics: dict, flags: list[dict], language: str) -> dict:
    # Placeholder until the LLM is wired up.
    changed = ", ".join(f["metric"] for f in flags) or "nothing unusual"
    return {
        "summaryParent": "Thank you for checking in today.",
        "summaryFamily": f"Check-in completed. Compared with their normal: {changed}.",
    }
