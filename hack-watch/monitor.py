#!/usr/bin/env python3
"""Poll the Agent Natives Builders Hackathon page, snapshot the facts that matter,
and diff against the previous run. Writes state.json (current) and history.json (changes)."""

import re, json, html, hashlib, subprocess, sys, os
from datetime import datetime, timezone, timedelta

URL = "https://www.immersivecommons.com/events/hackathon"
HERE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(HERE, "state.json")
HISTORY = os.path.join(HERE, "history.json")
PDT = timezone(timedelta(hours=-7))


def fetch():
    r = subprocess.run(
        ["curl", "-sL", "--max-time", "45", "-w", "\n@@HTTP:%{http_code}", URL],
        capture_output=True, text=True,
    )
    body = r.stdout
    code = None
    m = re.search(r"\n@@HTTP:(\d+)$", body)
    if m:
        code = int(m.group(1))
        body = body[: m.start()]
    return code, body


def text_of(raw):
    b = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", raw)
    b = re.sub(r"(?i)</?(div|p|br|li|tr|h[1-6]|section|header|footer|article|ul|ol|td|th|dt|dd|main|nav|span|details|summary)[^>]*>", "\n", b)
    b = re.sub(r"(?s)<[^>]+>", " ", b)
    b = html.unescape(b)
    b = re.sub(r"[ \t\xa0]+", " ", b)
    out, prev = [], None
    for line in (l.strip() for l in b.split("\n")):
        if line and line != prev:
            out.append(line)
            prev = line
    return "\n".join(out)


def ldjson(raw):
    blocks = re.findall(r'(?is)<script type="application/ld\+json"[^>]*>(.*?)</script>', raw)
    out = []
    for b in blocks:
        try:
            out.append(json.loads(html.unescape(b)))
        except Exception:
            pass
    return out


def first(pattern, s, group=1, flags=0):
    m = re.search(pattern, s, flags)
    return m.group(group).strip() if m else None


MCP = "https://www.immersivecommons.com/api/mcp"
EID = "anb-hack-01"
TOKEN_PATH = os.path.join(HERE, ".ic_token")


def mcp(tool, args=None):
    """One authenticated MCP tool call. Returns the parsed envelope, or None."""
    if not os.path.exists(TOKEN_PATH):
        return None
    token = open(TOKEN_PATH).read().strip()
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                          "params": {"name": tool, "arguments": args or {}}})
    r = subprocess.run(
        ["curl", "-s", "--max-time", "30", "-X", "POST", MCP,
         "-H", f"Authorization: Bearer {token}",
         "-H", "Content-Type: application/json",
         "-H", "Accept: application/json, text/event-stream",
         "-d", payload],
        capture_output=True, text=True)
    for line in r.stdout.splitlines():
        line = line.strip()
        if not line.startswith("data: "):
            continue
        try:
            d = json.loads(line[6:])
        except Exception:
            continue
        for c in d.get("result", {}).get("content", []):
            try:
                return json.loads(c.get("text", ""))
            except Exception:
                pass
    return None


def my_status():
    """What the event's own API says about this token holder."""
    out = {}
    me = mcp("ic_hack_me", {"eid": EID})
    if me and me.get("ok"):
        out["registered"] = me.get("registered")
        out["role"] = me.get("role")
        out["team"] = me.get("team")
        out["submission"] = me.get("submission")
        out["api_phase"] = me.get("phase")
    st = mcp("ic_hack_application_status", {"eid": EID})
    if st and st.get("ok"):
        out["applied"] = st.get("applied")
    ev = mcp("ic_hack_get", {"eid": EID})
    if ev and ev.get("ok"):
        seats = ev.get("seats") or {}
        out["api_seats_used"] = seats.get("used")
        out["api_seats_remaining"] = seats.get("remaining")
        out["bounty_count"] = len(ev.get("bounties") or [])
    tl = mcp("ic_hack_team_list", {"eid": EID})
    if tl and tl.get("ok"):
        out["team_count"] = len(tl.get("teams") or [])
        out["teams"] = sorted(t.get("name") for t in (tl.get("teams") or []) if t.get("name"))
    return out


def snapshot():
    code, raw = fetch()
    now = datetime.now(timezone.utc)
    snap = {
        "checked_at": now.isoformat(),
        "checked_at_pdt": now.astimezone(PDT).strftime("%Y-%m-%d %H:%M:%S PDT"),
        "http_status": code,
        "reachable": bool(code and 200 <= code < 400 and len(raw) > 2000),
    }
    if not snap["reachable"]:
        snap["error"] = f"HTTP {code}, {len(raw)} bytes"
        return snap, raw

    txt = text_of(raw)
    snap["page_bytes"] = len(raw)

    # --- the live status banner (server-rendered) ---
    banner = first(r'class="hack-status"[^>]*>(.*?)</p>', raw, flags=re.S)
    if banner:
        snap["status_banner"] = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>|<!--.*?-->", "", banner))).strip()
    seats = re.search(r"(\w[\w ]*?)\s*<!-- -->\s*·\s*<b>(\d+)</b> of <!-- -->(\d+)<!-- --> builder seats", raw)
    if seats:
        snap["registration_state"] = seats.group(1).strip()
        snap["seats_left"] = int(seats.group(2))
        snap["seats_total"] = int(seats.group(3))

    # --- the phase line (what the organisers are currently telling applicants) ---
    snap["phase_line"] = first(r'phaseLine\\":\\"(.*?)\\"', raw)
    snap["kicker"] = first(r'class="hack-kicker"[^>]*>(.*?)</p>', raw, flags=re.S)
    snap["late_door"] = "lateDoor\\\":true" in raw

    # --- structured event data ---
    for d in ldjson(raw):
        if d.get("@type") == "Event":
            snap["event"] = {
                "name": d.get("name"),
                "startDate": d.get("startDate"),
                "endDate": d.get("endDate"),
                "eventStatus": (d.get("eventStatus") or "").rsplit("/", 1)[-1],
                "location": (d.get("location") or {}).get("name"),
                "organizers": [o.get("name") for o in d.get("organizer", []) if isinstance(o, dict)],
                "sponsors": [o.get("name") for o in d.get("sponsor", []) if isinstance(o, dict)],
            }
        if d.get("@type") == "ItemList":
            people = {}
            for it in d.get("itemListElement", []):
                item = it.get("item", {})
                role = item.get("disambiguatingDescription", "?")
                people.setdefault(role, []).append(item.get("name"))
            snap["people"] = {k: sorted(v) for k, v in sorted(people.items())}

    # --- run of show: times are the thing that slips on the day ---
    runs = {}
    for day, label in (("Wednesday, August 26", "day1"), ("Thursday, August 27", "day2")):
        m = re.search(re.escape("Run of show, " + day) + r"(.*?)(?:Run of show|All times PDT)", txt, re.S)
        if m:
            rows = re.findall(r"^(\d{1,2}:\d{2})\n(.+)$", m.group(1), re.M)
            runs[label] = [{"time": t, "item": i.strip()} for t, i in rows]
    if runs:
        snap["run_of_show"] = runs

    # --- awards & sponsor bounties: the page says bounties appear "the moment one is real" ---
    m = re.search(r"Six winners.*?\n(.*?)Every line is a number", txt, re.S)
    if m:
        snap["awards"] = [l for l in m.group(1).split("\n") if l.strip()]
    m = re.search(r"Sponsor challenges\n(.*?)(?:Cloudflare San Francisco)", txt, re.S)
    if m:
        snap["sponsor_challenges"] = [l for l in m.group(1).split("\n") if l.strip()]

    # --- catch-all: has the prose changed anywhere? ---
    # --- what the API says about me (needs .ic_token) ---
    mine = my_status()
    if mine:
        snap.update(mine)

    snap["body_hash"] = hashlib.sha256(txt.encode()).hexdigest()[:16]
    snap["_text"] = txt
    return snap, raw


WATCH = [
    ("status_banner", "Status banner"),
    ("kicker", "Hero kicker line"),
    ("registration_state", "Registration state"),
    ("seats_left", "Seats left"),
    ("seats_total", "Seats total"),
    ("phase_line", "Phase line"),
    ("late_door", "Late door open"),
    ("event", "Event schema (dates/venue/status/orgs)"),
    ("people", "Judges / organisers / partners"),
    ("run_of_show", "Run of show"),
    ("awards", "Awards"),
    ("sponsor_challenges", "Sponsor challenges"),
    ("reachable", "Site reachable"),
    ("registered", "YOUR roster status"),
    ("role", "Your event role"),
    ("team", "Your team"),
    ("submission", "Your submission"),
    ("applied", "Your application"),
    ("api_phase", "API phase"),
    ("api_seats_used", "Seats used (API)"),
    ("team_count", "Teams that exist"),
    ("teams", "Team names"),
    ("bounty_count", "Sponsor bounties"),
]


def diff(old, new):
    if not old:
        return []
    changes = []
    for key, label in WATCH:
        a, b = old.get(key), new.get(key)
        if a != b:
            changes.append({"field": key, "label": label, "from": a, "to": b})
    if not changes and old.get("body_hash") != new.get("body_hash") and new.get("reachable"):
        changes.append({"field": "body_hash", "label": "Page prose changed (no tracked field moved)",
                        "from": old.get("body_hash"), "to": new.get("body_hash")})
    return changes


def main():
    old = None
    if os.path.exists(STATE):
        try:
            old = json.load(open(STATE))
        except Exception:
            pass

    new, _ = snapshot()
    changes = diff(old, new)

    hist = []
    if os.path.exists(HISTORY):
        try:
            hist = json.load(open(HISTORY))
        except Exception:
            pass
    if changes:
        hist.append({"at": new["checked_at"], "at_pdt": new["checked_at_pdt"], "changes": changes})
        json.dump(hist[-200:], open(HISTORY, "w"), indent=1)

    text = new.pop("_text", "")
    new["checks_run"] = (old.get("checks_run", 0) if old else 0) + 1
    new["change_events"] = len(hist)
    json.dump(new, open(STATE, "w"), indent=1)
    if text:
        open(os.path.join(HERE, "page.txt"), "w").write(text)

    print(json.dumps({"changes": changes, "state": {k: new.get(k) for k, _ in WATCH},
                      "checked_at_pdt": new["checked_at_pdt"], "checks_run": new["checks_run"]},
                     indent=1, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
