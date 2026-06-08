from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os
import uuid
import json
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

# --- File-based storage ---
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

def load(name: str) -> dict:
    p = DATA_DIR / f"{name}.json"
    if p.exists():
        return json.loads(p.read_text())
    return {}

def save(name: str, data: dict):
    p = DATA_DIR / f"{name}.json"
    p.write_text(json.dumps(data, indent=2))

# Collections stored as dict keyed by id
def col(name: str) -> dict:
    return load(name)

def col_save(name: str, data: dict):
    save(name, data)

JWT_SECRET = os.environ.get('JWT_SECRET', 'momentum-secret-key-2024')
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
        users = col("users")
        uid = payload["sub"]
        if uid not in users:
            raise HTTPException(401, "User not found")
        u = {k: v for k, v in users[uid].items() if k != "password_hash"}
        return u
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
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    recurrence: str = "once"
    day_of_week: Optional[int] = None
    date: Optional[str] = None

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
    date: str
    completed: bool

class EventIn(BaseModel):
    title: str
    date: str
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
    users = col("users")
    # Check email uniqueness
    for u in users.values():
        if u["email"] == email:
            raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    users[uid] = {
        "id": uid,
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name or email.split("@")[0],
        "created_at": now_iso(),
    }
    col_save("users", users)
    token = make_token(uid)
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=2592000, path="/")
    return {"id": uid, "email": email, "name": users[uid]["name"], "token": token}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    users = col("users")
    user = next((u for u in users.values() if u["email"] == email), None)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"])
    response.set_cookie("token", token, httponly=True, samesite="none", secure=True, max_age=2592000, path="/")
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
    data = col("sections")
    return [v for v in data.values() if v["user_id"] == user["id"]]

@api.post("/sections")
async def create_section(body: SectionIn, user=Depends(get_current_user)):
    data = col("sections")
    sid = str(uuid.uuid4())
    doc = {"id": sid, "user_id": user["id"], "name": body.name, "color": body.color, "created_at": now_iso()}
    data[sid] = doc
    col_save("sections", data)
    return doc

@api.delete("/sections/{sid}")
async def delete_section(sid: str, user=Depends(get_current_user)):
    data = col("sections")
    data.pop(sid, None)
    col_save("sections", data)
    # Unlink tasks
    tasks = col("tasks")
    for t in tasks.values():
        if t.get("section_id") == sid and t["user_id"] == user["id"]:
            t["section_id"] = None
    col_save("tasks", tasks)
    return {"ok": True}

# --- Tasks ---
@api.get("/tasks")
async def list_tasks(user=Depends(get_current_user)):
    data = col("tasks")
    return [v for v in data.values() if v["user_id"] == user["id"]]

@api.post("/tasks")
async def create_task(body: TaskIn, user=Depends(get_current_user)):
    data = col("tasks")
    tid = str(uuid.uuid4())
    doc = {
        "id": tid, "user_id": user["id"], "title": body.title,
        "section_id": body.section_id, "start_time": body.start_time,
        "end_time": body.end_time, "recurrence": body.recurrence,
        "day_of_week": body.day_of_week, "date": body.date, "created_at": now_iso(),
    }
    data[tid] = doc
    col_save("tasks", data)
    return doc

@api.patch("/tasks/{tid}")
async def update_task(tid: str, body: TaskUpdate, user=Depends(get_current_user)):
    data = col("tasks")
    if tid not in data:
        raise HTTPException(404, "Task not found")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    data[tid].update(upd)
    col_save("tasks", data)
    return data[tid]

@api.delete("/tasks/{tid}")
async def delete_task(tid: str, user=Depends(get_current_user)):
    data = col("tasks")
    data.pop(tid, None)
    col_save("tasks", data)
    comps = col("completions")
    to_del = [k for k, v in comps.items() if v["task_id"] == tid and v["user_id"] == user["id"]]
    for k in to_del:
        comps.pop(k)
    col_save("completions", comps)
    return {"ok": True}

# --- Completions ---
@api.get("/completions")
async def list_completions(start: Optional[str] = None, end: Optional[str] = None, user=Depends(get_current_user)):
    data = col("completions")
    result = [v for v in data.values() if v["user_id"] == user["id"]]
    if start and end:
        result = [v for v in result if start <= v["date"] <= end]
    return result

@api.post("/completions")
async def set_completion(body: CompletionIn, user=Depends(get_current_user)):
    data = col("completions")
    if body.completed:
        existing = next((v for v in data.values() if v["user_id"] == user["id"] and v["task_id"] == body.task_id and v["date"] == body.date), None)
        if not existing:
            cid = str(uuid.uuid4())
            doc = {"id": cid, "user_id": user["id"], "task_id": body.task_id, "date": body.date, "completed_at": now_iso()}
            data[cid] = doc
            col_save("completions", data)
            return doc
        return existing
    else:
        to_del = [k for k, v in data.items() if v["user_id"] == user["id"] and v["task_id"] == body.task_id and v["date"] == body.date]
        for k in to_del:
            data.pop(k)
        col_save("completions", data)
        return {"ok": True}

# --- Events ---
@api.get("/events")
async def list_events(user=Depends(get_current_user)):
    data = col("events")
    return [v for v in data.values() if v["user_id"] == user["id"]]

@api.post("/events")
async def create_event(body: EventIn, user=Depends(get_current_user)):
    data = col("events")
    eid = str(uuid.uuid4())
    doc = {"id": eid, "user_id": user["id"], "title": body.title, "date": body.date, "time": body.time, "description": body.description, "created_at": now_iso()}
    data[eid] = doc
    col_save("events", data)
    return doc

@api.delete("/events/{eid}")
async def delete_event(eid: str, user=Depends(get_current_user)):
    data = col("events")
    data.pop(eid, None)
    col_save("events", data)
    return {"ok": True}

# --- Goals ---
@api.get("/goals")
async def list_goals(user=Depends(get_current_user)):
    data = col("goals")
    return sorted([v for v in data.values() if v["user_id"] == user["id"]], key=lambda x: x["created_at"])

@api.post("/goals")
async def create_goal(body: GoalIn, user=Depends(get_current_user)):
    data = col("goals")
    gid = str(uuid.uuid4())
    doc = {"id": gid, "user_id": user["id"], "title": body.title, "description": body.description, "target": body.target, "current": body.current, "created_at": now_iso()}
    data[gid] = doc
    col_save("goals", data)
    return doc

@api.patch("/goals/{gid}")
async def update_goal(gid: str, body: GoalUpdate, user=Depends(get_current_user)):
    data = col("goals")
    if gid not in data:
        raise HTTPException(404, "Goal not found")
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    data[gid].update(upd)
    col_save("goals", data)
    return data[gid]

@api.delete("/goals/{gid}")
async def delete_goal(gid: str, user=Depends(get_current_user)):
    data = col("goals")
    data.pop(gid, None)
    col_save("goals", data)
    rewards = col("rewards")
    to_del = [k for k, v in rewards.items() if v.get("goal_id") == gid and v["user_id"] == user["id"]]
    for k in to_del:
        rewards.pop(k)
    col_save("rewards", rewards)
    return {"ok": True}

# --- Rewards ---
@api.get("/rewards")
async def list_rewards(user=Depends(get_current_user)):
    data = col("rewards")
    return [v for v in data.values() if v["user_id"] == user["id"]]

@api.post("/rewards")
async def create_reward(body: RewardIn, user=Depends(get_current_user)):
    data = col("rewards")
    rid = str(uuid.uuid4())
    doc = {"id": rid, "user_id": user["id"], "title": body.title, "goal_id": body.goal_id, "order": body.order, "claimed": False, "claimed_at": None, "created_at": now_iso()}
    data[rid] = doc
    col_save("rewards", data)
    return doc

@api.post("/rewards/{rid}/claim")
async def claim_reward(rid: str, user=Depends(get_current_user)):
    data = col("rewards")
    if rid not in data:
        raise HTTPException(404, "Reward not found")
    data[rid].update({"claimed": True, "claimed_at": now_iso()})
    col_save("rewards", data)
    return data[rid]

@api.delete("/rewards/{rid}")
async def delete_reward(rid: str, user=Depends(get_current_user)):
    data = col("rewards")
    data.pop(rid, None)
    col_save("rewards", data)
    return {"ok": True}

# --- Health ---
@api.get("/")
async def root():
    return {"ok": True}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
