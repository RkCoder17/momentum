"""Backend API tests for Personal Progress Tracker."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://momentum-log-33.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

EMAIL = f"test_{int(time.time())}@example.com"
PASSWORD = "test1234"

state = {}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Auth ---
def test_register(session):
    r = session.post(f"{API}/auth/register", json={"email": EMAIL, "password": PASSWORD, "name": "Tester"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == EMAIL
    assert "token" in data and len(data["token"]) > 10
    state["token"] = data["token"]
    state["user_id"] = data["id"]
    session.headers.update({"Authorization": f"Bearer {state['token']}"})


def test_login(session):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, r.text
    assert r.json()["email"] == EMAIL


def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == EMAIL


def test_auth_protection():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401
    r = requests.get(f"{API}/tasks")
    assert r.status_code == 401


# --- Sections ---
def test_create_section(session):
    r = session.post(f"{API}/sections", json={"name": "Health", "color": "#10B981"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["name"] == "Health"
    state["section_id"] = d["id"]
    r2 = session.get(f"{API}/sections")
    assert any(s["id"] == d["id"] for s in r2.json())


# --- Tasks ---
def test_create_recurring_task(session):
    r = session.post(f"{API}/tasks", json={
        "title": "Morning Run",
        "section_id": state["section_id"],
        "start_time": "09:00",
        "end_time": "10:00",
        "recurrence": "weekly",
        "day_of_week": 0,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["title"] == "Morning Run"
    assert d["recurrence"] == "weekly"
    assert d["day_of_week"] == 0
    state["task_recurring"] = d["id"]


def test_create_once_task(session):
    r = session.post(f"{API}/tasks", json={
        "title": "One-off",
        "recurrence": "once",
        "date": "2026-01-15",
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["recurrence"] == "once"
    assert d["date"] == "2026-01-15"
    state["task_once"] = d["id"]


def test_list_tasks(session):
    r = session.get(f"{API}/tasks")
    assert r.status_code == 200
    ids = [t["id"] for t in r.json()]
    assert state["task_recurring"] in ids
    assert state["task_once"] in ids


def test_update_task(session):
    r = session.patch(f"{API}/tasks/{state['task_recurring']}", json={"title": "Morning Yoga"})
    assert r.status_code == 200
    assert r.json()["title"] == "Morning Yoga"


# --- Completions ---
def test_completion_toggle(session):
    r = session.post(f"{API}/completions", json={
        "task_id": state["task_recurring"], "date": "2026-01-12", "completed": True,
    })
    assert r.status_code == 200
    r = session.get(f"{API}/completions", params={"start": "2026-01-01", "end": "2026-01-31"})
    assert r.status_code == 200
    assert any(c["task_id"] == state["task_recurring"] for c in r.json())
    # uncomplete
    r = session.post(f"{API}/completions", json={
        "task_id": state["task_recurring"], "date": "2026-01-12", "completed": False,
    })
    assert r.status_code == 200
    r = session.get(f"{API}/completions", params={"start": "2026-01-01", "end": "2026-01-31"})
    assert not any(c["task_id"] == state["task_recurring"] and c["date"] == "2026-01-12" for c in r.json())


# --- Events ---
def test_event_crud(session):
    r = session.post(f"{API}/events", json={"title": "Dentist", "date": "2026-01-20", "time": "14:00"})
    assert r.status_code == 200
    eid = r.json()["id"]
    r = session.get(f"{API}/events")
    assert any(e["id"] == eid for e in r.json())
    r = session.delete(f"{API}/events/{eid}")
    assert r.status_code == 200


# --- Goals & Rewards ---
def test_goal_and_reward_flow(session):
    r = session.post(f"{API}/goals", json={"title": "Read 12 books", "target": 12, "current": 0})
    assert r.status_code == 200
    gid = r.json()["id"]
    r = session.patch(f"{API}/goals/{gid}", json={"current": 3})
    assert r.status_code == 200
    assert r.json()["current"] == 3

    r = session.post(f"{API}/rewards", json={"title": "New Book", "goal_id": gid, "order": 1})
    assert r.status_code == 200
    rid = r.json()["id"]
    assert r.json()["claimed"] is False

    r = session.post(f"{API}/rewards/{rid}/claim")
    assert r.status_code == 200
    assert r.json()["claimed"] is True

    r = session.delete(f"{API}/rewards/{rid}")
    assert r.status_code == 200
    r = session.delete(f"{API}/goals/{gid}")
    assert r.status_code == 200


# --- Cleanup deletes ---
def test_cleanup(session):
    for tid in (state.get("task_recurring"), state.get("task_once")):
        if tid:
            r = session.delete(f"{API}/tasks/{tid}")
            assert r.status_code == 200
    r = session.delete(f"{API}/sections/{state['section_id']}")
    assert r.status_code == 200
