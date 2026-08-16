from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional, Annotated, Any
from bson import ObjectId
import uuid
from datetime import datetime, timezone, timedelta
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="Device Manager Pro API")
api_router = APIRouter(prefix="/api")


# ----------------------- Helpers -----------------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso() -> str:
    return now_utc().isoformat()


PyObjectId = Annotated[str, BeforeValidator(str)]


# ----------------------- Models -----------------------
class ScanCreate(BaseModel):
    device_id: str
    type: str = "quick"  # quick | clean | duplicate | security | optimise
    health_score: int = 0
    junk_bytes: int = 0
    duplicate_count: int = 0
    photo_count: int = 0
    app_count: int = 0
    storage_used: int = 0
    storage_total: int = 0
    battery_level: float = 0.0
    freed_bytes: int = 0


class Scan(ScanCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=iso)


class Prefs(BaseModel):
    device_id: str
    premium: bool = False
    autopilot: bool = False
    schedule: str = "weekly"  # off | daily | weekly
    notifications: bool = True
    large_file_threshold_mb: int = 50


class TrashItemCreate(BaseModel):
    device_id: Optional[str] = None
    name: str
    kind: str = "photo"  # photo | file | video | audio | app
    size_bytes: int = 0
    thumb_uri: Optional[str] = None
    origin: Optional[str] = None


class TrashItem(TrashItemCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deleted_at: str = Field(default_factory=iso)
    expires_at: str = Field(
        default_factory=lambda: (now_utc() + timedelta(days=7)).isoformat()
    )


class TrashAddRequest(BaseModel):
    device_id: str
    items: List[TrashItemCreate]


class TrashActionRequest(BaseModel):
    device_id: str
    ids: List[str] = []


class VaultItemCreate(BaseModel):
    device_id: str
    name: str
    kind: str = "photo"
    size_bytes: int = 0
    thumb_uri: Optional[str] = None


class VaultItem(VaultItemCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    added_at: str = Field(default_factory=iso)


def clean_doc(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ----------------------- Routes -----------------------
@api_router.get("/")
async def root():
    return {"message": "Device Manager Pro API", "status": "ok"}


@api_router.post("/scans", response_model=Scan)
async def create_scan(payload: ScanCreate):
    scan = Scan(**payload.dict())
    await db.scans.insert_one(scan.dict())
    return scan


@api_router.get("/scans", response_model=List[Scan])
async def list_scans(device_id: str, limit: int = 30):
    cursor = db.scans.find({"device_id": device_id}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [Scan(**clean_doc(d)) for d in docs]


def build_tip(latest: Optional[dict]) -> dict:
    if not latest:
        return {
            "title": "Run your first scan",
            "body": "Tap Optimise to check your device health and free up space.",
            "icon": "sparkles",
        }
    storage_pct = 0
    if latest.get("storage_total"):
        storage_pct = round(latest["storage_used"] / latest["storage_total"] * 100)
    if storage_pct >= 85:
        return {
            "title": "Storage almost full",
            "body": f"Your storage is {storage_pct}% used. Clean junk and duplicates to free space fast.",
            "icon": "warning",
        }
    if latest.get("duplicate_count", 0) >= 20:
        return {
            "title": "Duplicate photos piling up",
            "body": f"We spotted {latest['duplicate_count']} duplicate photos. Review them to reclaim space.",
            "icon": "images",
        }
    if latest.get("battery_level", 1) and latest["battery_level"] < 0.2:
        return {
            "title": "Battery running low",
            "body": "Enable battery saver and close heavy background apps to last longer.",
            "icon": "battery-half",
        }
    return {
        "title": "Your device is in good shape",
        "body": "Keep it that way — a quick weekly clean prevents slowdowns.",
        "icon": "shield-checkmark",
    }


@api_router.get("/dashboard")
async def dashboard(device_id: str):
    cursor = db.scans.find({"device_id": device_id}).sort("created_at", -1).limit(14)
    docs = await cursor.to_list(length=14)
    docs = [clean_doc(d) for d in docs]
    latest = docs[0] if docs else None
    trend = [
        {"score": d.get("health_score", 0), "at": d.get("created_at")}
        for d in reversed(docs)
    ]

    # Predict days until full using last two distinct-storage scans
    predict_days: Optional[int] = None
    if len(docs) >= 2 and latest and latest.get("storage_total"):
        newest = docs[0]
        oldest = docs[-1]
        used_delta = newest.get("storage_used", 0) - oldest.get("storage_used", 0)
        try:
            t_new = datetime.fromisoformat(newest["created_at"])
            t_old = datetime.fromisoformat(oldest["created_at"])
            days = max((t_new - t_old).total_seconds() / 86400.0, 0.01)
            rate = used_delta / days  # bytes/day
            if rate > 0:
                remaining = newest["storage_total"] - newest["storage_used"]
                predict_days = int(remaining / rate)
        except Exception:
            predict_days = None

    return {
        "latest": latest,
        "trend": trend,
        "tip": build_tip(latest),
        "predict_days_until_full": predict_days,
        "scan_count": await db.scans.count_documents({"device_id": device_id}),
    }


def parse_json_block(text: str) -> Optional[dict]:
    try:
        start = text.index("{")
        end = text.rindex("}") + 1
        return json.loads(text[start:end])
    except Exception:
        return None


@api_router.get("/ai-tip")
async def ai_tip(device_id: str):
    today = now_utc().strftime("%Y-%m-%d")
    cached = await db.ai_tips.find_one({"device_id": device_id, "date": today})
    if cached:
        return {
            "title": cached["title"],
            "body": cached["body"],
            "icon": cached.get("icon", "bulb"),
            "ai": True,
        }

    doc = await db.scans.find_one({"device_id": device_id}, sort=[("created_at", -1)])
    latest = clean_doc(doc) if doc else None
    fallback = build_tip(latest)

    if not EMERGENT_LLM_KEY or not latest:
        return {**fallback, "ai": False}

    storage_pct = 0
    if latest.get("storage_total"):
        storage_pct = round(latest["storage_used"] / latest["storage_total"] * 100)
    metrics = (
        f"Health score: {latest.get('health_score', 0)}/100. "
        f"Storage used: {storage_pct}%. "
        f"Estimated junk: {round(latest.get('junk_bytes', 0) / (1024*1024))} MB. "
        f"Duplicate photos: {latest.get('duplicate_count', 0)}. "
        f"Photos on device: {latest.get('photo_count', 0)}. "
        f"Battery level: {round(latest.get('battery_level', 0) * 100)}%."
    )

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"tip-{device_id}-{today}",
            system_message=(
                "You are the AI Phone Doctor inside a phone cleaner app. "
                "Given device metrics, write ONE short, friendly, specific daily tip. "
                "Be honest — never claim fake RAM/CPU boosts. Focus on real actions the user "
                "can take (clean junk, remove duplicates, free storage, save battery). "
                "Respond ONLY with compact JSON: "
                '{"title": "<max 5 words>", "body": "<max 24 words>", '
                '"icon": "<one ionicon name from: sparkles, images, warning, battery-half, '
                'shield-checkmark, trending-up, cloud-upload, bulb>"}'
            ),
        ).with_model("openai", "gpt-5.4-mini")
        resp = await chat.send_message(UserMessage(text=metrics))
        parsed = parse_json_block(resp if isinstance(resp, str) else str(resp))
        if parsed and parsed.get("title") and parsed.get("body"):
            tip = {
                "title": str(parsed["title"])[:60],
                "body": str(parsed["body"])[:200],
                "icon": parsed.get("icon", "bulb"),
            }
            await db.ai_tips.update_one(
                {"device_id": device_id, "date": today},
                {"$set": {**tip, "device_id": device_id, "date": today}},
                upsert=True,
            )
            return {**tip, "ai": True}
    except Exception as e:
        logging.warning(f"ai-tip generation failed: {e}")

    return {**fallback, "ai": False}


@api_router.get("/prefs", response_model=Prefs)
async def get_prefs(device_id: str):
    doc = await db.prefs.find_one({"device_id": device_id})
    if not doc:
        p = Prefs(device_id=device_id)
        await db.prefs.insert_one(p.dict())
        return p
    return Prefs(**clean_doc(doc))


@api_router.put("/prefs", response_model=Prefs)
async def update_prefs(payload: Prefs):
    await db.prefs.update_one(
        {"device_id": payload.device_id}, {"$set": payload.dict()}, upsert=True
    )
    return payload


async def purge_expired(device_id: str):
    await db.trash.delete_many(
        {"device_id": device_id, "expires_at": {"$lt": iso()}}
    )


@api_router.get("/trash", response_model=List[TrashItem])
async def list_trash(device_id: str):
    await purge_expired(device_id)
    cursor = db.trash.find({"device_id": device_id}).sort("deleted_at", -1)
    docs = await cursor.to_list(length=1000)
    return [TrashItem(**clean_doc(d)) for d in docs]


@api_router.post("/trash", response_model=List[TrashItem])
async def add_trash(payload: TrashAddRequest):
    created = []
    for item in payload.items:
        data = item.dict()
        data["device_id"] = payload.device_id
        t = TrashItem(**data)
        created.append(t)
    if created:
        await db.trash.insert_many([t.dict() for t in created])
    return created


@api_router.post("/trash/restore")
async def restore_trash(payload: TrashActionRequest):
    res = await db.trash.delete_many(
        {"device_id": payload.device_id, "id": {"$in": payload.ids}}
    )
    return {"restored": res.deleted_count}


@api_router.delete("/trash")
async def delete_trash(payload: TrashActionRequest):
    if payload.ids:
        res = await db.trash.delete_many(
            {"device_id": payload.device_id, "id": {"$in": payload.ids}}
        )
    else:
        res = await db.trash.delete_many({"device_id": payload.device_id})
    return {"deleted": res.deleted_count}


@api_router.get("/vault", response_model=List[VaultItem])
async def list_vault(device_id: str):
    cursor = db.vault.find({"device_id": device_id}).sort("added_at", -1)
    docs = await cursor.to_list(length=1000)
    return [VaultItem(**clean_doc(d)) for d in docs]


@api_router.post("/vault", response_model=VaultItem)
async def add_vault(payload: VaultItemCreate):
    item = VaultItem(**payload.dict())
    await db.vault.insert_one(item.dict())
    return item


@api_router.delete("/vault/{item_id}")
async def remove_vault(item_id: str, device_id: str):
    res = await db.vault.delete_one({"device_id": device_id, "id": item_id})
    return {"deleted": res.deleted_count}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
