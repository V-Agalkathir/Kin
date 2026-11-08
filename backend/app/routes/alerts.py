from fastapi import APIRouter

from app.models import FallAlert

router = APIRouter()
ALERT_LOG: list[FallAlert] = []  # log every alert, including false alarms, for tuning


@router.post("/alerts")
def create_alert(alert: FallAlert):
    ALERT_LOG.append(alert)
    if not alert.respondedOk:
        # TODO(B, Phase 4): look up family contact and call app.services.notify.alert_family
        pass
    return {"logged": True, "escalated": not alert.respondedOk}
