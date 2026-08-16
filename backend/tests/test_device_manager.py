"""Backend tests for Device Manager Pro API"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://device-manager-pro-28.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def device_id():
    return f"TEST_{uuid.uuid4().hex[:12]}"


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ---------- Health ----------
class TestHealth:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"


# ---------- AI Tip ----------
class TestAiTip:
    def test_ai_tip_no_scan_returns_fallback(self, s):
        """Fresh device with no scans should gracefully return ai:false, no 500."""
        fresh_dev = f"TEST_{uuid.uuid4().hex[:12]}"
        r = s.get(f"{API}/ai-tip", params={"device_id": fresh_dev})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ai") is False
        assert isinstance(data.get("title"), str) and data["title"]
        assert isinstance(data.get("body"), str) and data["body"]
        assert "icon" in data

    def test_ai_tip_with_scan_and_caching(self, s):
        """With a scan seeded, first call may be ai:true (LLM) and 2nd call must be identical (cached)."""
        dev = f"TEST_{uuid.uuid4().hex[:12]}"
        seed = {
            "device_id": dev,
            "type": "quick",
            "health_score": 62,
            "junk_bytes": 900_000_000,
            "duplicate_count": 34,
            "photo_count": 4200,
            "app_count": 128,
            "storage_used": 92_000_000_000,
            "storage_total": 128_000_000_000,
            "battery_level": 0.35,
        }
        rc = s.post(f"{API}/scans", json=seed)
        assert rc.status_code == 200, rc.text

        r1 = s.get(f"{API}/ai-tip", params={"device_id": dev}, timeout=60)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1.get("title") and d1.get("body") and "icon" in d1

        r2 = s.get(f"{API}/ai-tip", params={"device_id": dev}, timeout=60)
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        # Cached call must match exactly
        assert d2["title"] == d1["title"]
        assert d2["body"] == d1["body"]
        assert d2["icon"] == d1["icon"]
        # If LLM succeeded, both should say ai:true; if fallback both ai:false
        assert d2.get("ai") == d1.get("ai")


# ---------- Scans + Dashboard ----------
class TestScans:
    def test_create_scan(self, s, device_id):
        payload = {
            "device_id": device_id,
            "type": "quick",
            "health_score": 82,
            "junk_bytes": 500_000_000,
            "duplicate_count": 12,
            "photo_count": 400,
            "app_count": 55,
            "storage_used": 60_000_000_000,
            "storage_total": 128_000_000_000,
            "battery_level": 0.65,
        }
        r = s.post(f"{API}/scans", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["device_id"] == device_id
        assert d["health_score"] == 82
        assert "id" in d and "created_at" in d
        assert "_id" not in d

    def test_create_second_scan(self, s, device_id):
        r = s.post(f"{API}/scans", json={
            "device_id": device_id, "type": "clean", "health_score": 90,
            "storage_used": 61_000_000_000, "storage_total": 128_000_000_000,
            "freed_bytes": 300_000_000,
        })
        assert r.status_code == 200

    def test_list_scans(self, s, device_id):
        r = s.get(f"{API}/scans", params={"device_id": device_id})
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 2
        assert all("_id" not in x for x in arr)

    def test_dashboard(self, s, device_id):
        r = s.get(f"{API}/dashboard", params={"device_id": device_id})
        assert r.status_code == 200
        d = r.json()
        assert "latest" in d and d["latest"] is not None
        assert "trend" in d and isinstance(d["trend"], list)
        assert "tip" in d and "title" in d["tip"]
        assert "predict_days_until_full" in d
        assert d.get("scan_count", 0) >= 2

    def test_dashboard_empty_device(self, s):
        r = s.get(f"{API}/dashboard", params={"device_id": f"TEST_empty_{uuid.uuid4().hex[:6]}"})
        assert r.status_code == 200
        d = r.json()
        assert d["latest"] is None
        assert d["trend"] == []
        assert d["scan_count"] == 0
        assert d["tip"]["title"]  # default tip


# ---------- Prefs ----------
class TestPrefs:
    def test_get_creates_defaults(self, s, device_id):
        r = s.get(f"{API}/prefs", params={"device_id": device_id})
        assert r.status_code == 200
        p = r.json()
        assert p["device_id"] == device_id
        assert p["premium"] is False
        assert p["autopilot"] is False
        assert p["schedule"] == "weekly"
        assert p["notifications"] is True

    def test_update_persists(self, s, device_id):
        payload = {
            "device_id": device_id,
            "premium": True,
            "autopilot": True,
            "schedule": "daily",
            "notifications": False,
            "large_file_threshold_mb": 100,
        }
        r = s.put(f"{API}/prefs", json=payload)
        assert r.status_code == 200
        # verify with GET
        r2 = s.get(f"{API}/prefs", params={"device_id": device_id})
        p = r2.json()
        assert p["premium"] is True
        assert p["autopilot"] is True
        assert p["schedule"] == "daily"
        assert p["notifications"] is False
        assert p["large_file_threshold_mb"] == 100


# ---------- Trash ----------
class TestTrash:
    trash_ids: list = []

    def test_add_batch(self, s, device_id):
        payload = {
            "device_id": device_id,
            "items": [
                {"device_id": device_id, "name": "TEST_a.jpg", "kind": "photo", "size_bytes": 1024},
                {"device_id": device_id, "name": "TEST_b.mp4", "kind": "video", "size_bytes": 2048},
                {"device_id": device_id, "name": "TEST_c.pdf", "kind": "file", "size_bytes": 512},
            ],
        }
        r = s.post(f"{API}/trash", json=payload)
        assert r.status_code == 200, r.text
        arr = r.json()
        assert len(arr) == 3
        for it in arr:
            assert "expires_at" in it and it["expires_at"]
            assert "deleted_at" in it
            assert "_id" not in it
            TestTrash.trash_ids.append(it["id"])

    def test_list(self, s, device_id):
        r = s.get(f"{API}/trash", params={"device_id": device_id})
        assert r.status_code == 200
        arr = r.json()
        assert len(arr) >= 3

    def test_restore(self, s, device_id):
        ids_to_restore = TestTrash.trash_ids[:1]
        r = s.post(f"{API}/trash/restore", json={"device_id": device_id, "ids": ids_to_restore})
        assert r.status_code == 200
        assert r.json()["restored"] == 1
        # verify removed
        r2 = s.get(f"{API}/trash", params={"device_id": device_id})
        remaining_ids = [x["id"] for x in r2.json()]
        assert ids_to_restore[0] not in remaining_ids

    def test_delete_by_ids(self, s, device_id):
        ids_to_del = TestTrash.trash_ids[1:2]
        r = s.request("DELETE", f"{API}/trash", json={"device_id": device_id, "ids": ids_to_del})
        assert r.status_code == 200
        assert r.json()["deleted"] == 1

    def test_delete_all(self, s, device_id):
        r = s.request("DELETE", f"{API}/trash", json={"device_id": device_id, "ids": []})
        assert r.status_code == 200
        r2 = s.get(f"{API}/trash", params={"device_id": device_id})
        assert r2.json() == []


# ---------- Vault ----------
class TestVault:
    vault_id = None

    def test_add(self, s, device_id):
        r = s.post(f"{API}/vault", json={
            "device_id": device_id, "name": "TEST_secret.jpg", "kind": "photo", "size_bytes": 4096,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_secret.jpg"
        assert "id" in d and "_id" not in d
        TestVault.vault_id = d["id"]

    def test_list(self, s, device_id):
        r = s.get(f"{API}/vault", params={"device_id": device_id})
        assert r.status_code == 200
        arr = r.json()
        assert any(x["id"] == TestVault.vault_id for x in arr)

    def test_delete(self, s, device_id):
        r = s.delete(f"{API}/vault/{TestVault.vault_id}", params={"device_id": device_id})
        assert r.status_code == 200
        assert r.json()["deleted"] == 1
        # verify removed
        r2 = s.get(f"{API}/vault", params={"device_id": device_id})
        assert not any(x["id"] == TestVault.vault_id for x in r2.json())
