from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import alerts, checkins

load_dotenv()

app = FastAPI(title="Kin API")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["*"], allow_headers=["*"])
app.include_router(checkins.router)
app.include_router(alerts.router)


@app.get("/health")
def health():
    return {"ok": True}
