"""Twilio call + SMS to the family contact for Watch-mode alerts. Never dials emergency services."""
import os

from twilio.rest import Client


def alert_family(to_number: str, message: str) -> None:
    client = Client(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"])
    from_number = os.environ["TWILIO_FROM_NUMBER"]
    client.messages.create(to=to_number, from_=from_number, body=message)
    client.calls.create(to=to_number, from_=from_number, twiml=f"<Response><Say>{message}</Say></Response>")
