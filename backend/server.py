from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# --- Setup ---
mongo_url = os.environ['MONGO_URL']
_use_mock = "localhost" in mongo_url or "127.0.0.1" in mongo_url
if _use_mock:
    try:
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
    except ImportError:
        client = AsyncIOMotorClient(mongo_url)
else:
    client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"

app = FastAPI()
api = APIRouter(prefix="/api")


# --- Helpers ---
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Models ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SectionIn(BaseModel):
    name: str
    color: Optional[str] = "#D97706"


class TaskIn(BaseModel):
    title: str
    section_id: Optional[str] = None
    start_time: Optional[str] = None  # "09:00"
    end_time: Optional[str] = None
    recurrence: str = "once"  # "once" | "weekly"
    day_of_week: Optional[int] = None  # 0=Mon ... 6=Sun (for weekly)
    date: Optional[str] = None  # YYYY-MM-DD (for once)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    section_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    recurrence: Optional[str] = None
    day_of_week: Optional[int] = None
    date: Optional[str] = None


class CompletionIn(BaseModel):
    task_id: str
    date: str  # YYYY-MM-DD
    completed: bool


class EventIn(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    time: Optional[str] = None
    description: Optional[str] = None


class GoalIn(BaseModel):
    title: str
    description: Optional[str] = None
    target: int = 100
    current: int = 0


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target: Optional[int] = None
    current: Optional[int] = None


class RewardIn(BaseModel):
    title: str
    goal_id: Optional[str] = None
    order: int = 0


# --- Auth ---
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name or email.split("@")[0],
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = make_token(uid)
    response.set_cookie("token", token, httponly=True, samesite="lax", max_age=2592000, path="/")
    return {"id": uid, "email": email, "name": user["name"], "token": token}


@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"])
    response.set_cookie("token", token, httponly=True, samesite="lax", max_age=2592000, path="/")
    return {"id": user["id"], "email": user["email"], "name": user.get("name"), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# --- Sections ---
@api.get("/sections")
async def list_sections(user=Depends(get_current_user)):
    docs = await db.sections.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs


@api.post("/sections")
async def create_section(body: SectionIn, user=Depends(get_current_user)):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "name": body.name, "color": body.color, "created_at": now_iso()}
    await db.sections.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/sections/{sid}")
async def delete_section(sid: str, user=Depends(get_current_user)):
    await db.sections.delete_one({"id": sid, "user_id": user["id"]})
    await db.tasks.update_many({"section_id": sid, "user_id": user["id"]}, {"$set": {"section_id": None}})
    return {"ok": True}


# --- Tasks ---
@api.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    docs = await db.tasks.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    return docs


@api.post("/tasks")
async def create_task(body: TaskIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title,
        "section_id": body.section_id,
        "start_time": body.start_time,
        "end_time": body.end_time,
        "recurrence": body.recurrence,
        "day_of_week": body.day_of_week,
        "date": body.date,
        "created_at": now_iso(),
    }
    await db.tasks.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/tasks/{tid}")
async def update_task(tid: str, body: TaskUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.tasks.update_one({"id": tid, "user_id": user["id"]}, {"$set": upd})
    doc = await db.tasks.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})
    return doc


@api.delete("/tasks/{tid}")
async def delete_task(tid: str, user=Depends(get_current_user)):
    await db.tasks.delete_one({"id": tid, "user_id": user["id"]})
    await db.completions.delete_many({"task_id": tid, "user_id": user["id"]})
    return {"ok": True}


# --- Completions ---
@api.get("/completions")
async def list_completions(start: Optional[str] = None, end: Optional[str] = None, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if start and end:
        q["date"] = {"$gte": start, "$lte": end}
    docs = await db.completions.find(q, {"_id": 0}).to_list(5000)
    return docs


@api.post("/completions")
async def set_completion(body: CompletionIn, user=Depends(get_current_user)):
    if body.completed:
        existing = await db.completions.find_one({"user_id": user["id"], "task_id": body.task_id, "date": body.date}, {"_id": 0})
        if not existing:
            doc = {
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "task_id": body.task_id,
                "date": body.date,
                "completed_at": now_iso(),
            }
            await db.completions.insert_one(doc)
            doc.pop("_id", None)
            return doc
        return existing
    else:
        await db.completions.delete_one({"user_id": user["id"], "task_id": body.task_id, "date": body.date})
        return {"ok": True}


# --- Events ---
@api.get("/events")
async def list_events(user=Depends(get_current_user)):
    docs = await db.events.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    return docs


@api.post("/events")
async def create_event(body: EventIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title,
        "date": body.date,
        "time": body.time,
        "description": body.description,
        "created_at": now_iso(),
    }
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/events/{eid}")
async def delete_event(eid: str, user=Depends(get_current_user)):
    await db.events.delete_one({"id": eid, "user_id": user["id"]})
    return {"ok": True}


# --- Goals ---
@api.get("/goals")
async def list_goals(user=Depends(get_current_user)):
    docs = await db.goals.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return docs


@api.post("/goals")
async def create_goal(body: GoalIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title,
        "description": body.description,
        "target": body.target,
        "current": body.current,
        "created_at": now_iso(),
    }
    await db.goals.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/goals/{gid}")
async def update_goal(gid: str, body: GoalUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.goals.update_one({"id": gid, "user_id": user["id"]}, {"$set": upd})
    return await db.goals.find_one({"id": gid, "user_id": user["id"]}, {"_id": 0})


@api.delete("/goals/{gid}")
async def delete_goal(gid: str, user=Depends(get_current_user)):
    await db.goals.delete_one({"id": gid, "user_id": user["id"]})
    await db.rewards.delete_many({"goal_id": gid, "user_id": user["id"]})
    return {"ok": True}


# --- Rewards ---
@api.get("/rewards")
async def list_rewards(user=Depends(get_current_user)):
    docs = await db.rewards.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs


@api.post("/rewards")
async def create_reward(body: RewardIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": body.title,
        "goal_id": body.goal_id,
        "order": body.order,
        "claimed": False,
        "claimed_at": None,
        "created_at": now_iso(),
    }
    await db.rewards.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.post("/rewards/{rid}/claim")
async def claim_reward(rid: str, user=Depends(get_current_user)):
    await db.rewards.update_one(
        {"id": rid, "user_id": user["id"]},
        {"$set": {"claimed": True, "claimed_at": now_iso()}},
    )
    return await db.rewards.find_one({"id": rid, "user_id": user["id"]}, {"_id": 0})


@api.delete("/rewards/{rid}")
async def delete_reward(rid: str, user=Depends(get_current_user)):
    await db.rewards.delete_one({"id": rid, "user_id": user["id"]})
    return {"ok": True}


# --- Health ---
@api.get("/")
async def root():
    return {"ok": True}


# --- Startup ---
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.tasks.create_index([("user_id", 1)])
    await db.completions.create_index([("user_id", 1), ("date", 1)])
    await db.events.create_index([("user_id", 1), ("date", 1)])


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
