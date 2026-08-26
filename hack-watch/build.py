#!/usr/bin/env python3
"""Render the watch dashboard from state.json + history.json."""
import json, os, html
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "hackathon-watch.html")
PDT = timezone(timedelta(hours=-7))

state = json.load(open(os.path.join(HERE, "state.json")))
history = []
if os.path.exists(os.path.join(HERE, "history.json")):
    try:
        history = json.load(open(os.path.join(HERE, "history.json")))
    except Exception:
        pass

# Absolute timestamps for every run-of-show row, so the browser can place "now".
DAYS = {"day1": ("2026-08-26", "Wednesday, August 26"), "day2": ("2026-08-27", "Thursday, August 27")}
sched = []
for key, (date, label) in DAYS.items():
    for row in state.get("run_of_show", {}).get(key, []):
        sched.append({"day": key, "dayLabel": label, "time": row["time"], "item": row["item"],
                      "iso": f"{date}T{row['time']}:00-07:00",
                      "hard": row["item"].lower().startswith(("submissions lock", "floor clear", "results"))})

# Discrepancies the monitor can assert from the data it holds.
flags = []
reg = (state.get("registration_state") or "").lower()
phase = (state.get("phase_line") or "").lower()
if "open" in reg and ("application is closed" in phase or state.get("late_door")):
    flags.append({
        "sev": "warn",
        "title": "Hero says “Registration open”, the line below says applications are closed",
        "body": "Both are server-rendered on the same load, and the rendered DOM in Chrome agrees, so this is what a visitor actually sees — not a hydration artifact.",
        "ticket": True})
if state.get("seats_left") is not None and state.get("seats_left") == state.get("seats_total"):
    flags.append({
        "sev": "warn",
        "title": f"Seat counter reads {state['seats_left']} of {state['seats_total']} left — zero consumed, on the day",
        "body": "The roster froze Aug 24 and the name list went to Cloudflare for badges. The counter is very likely not decrementing on approval. The page's own tool table maps “Seats remaining” to ic_hack_get, so an agent reading that would conclude the room is empty.",
        "ticket": True})

data = {
    "state": state,
    "sched": sched,
    "history": history[-40:][::-1],
    "flags": flags,
    "ticket": "fb_2026-08-26T19-29-16_30e1bd9e4450",
    "newFlags": [f["title"] for f in flags if f["title"] not in json.load(open(os.path.join(HERE,"reported.json"))) ] if os.path.exists(os.path.join(HERE,"reported.json")) else [f["title"] for f in flags],
    "builtAt": datetime.now(timezone.utc).isoformat(),
}

if state.get("registered") is False:
    flags.insert(0, {
        "sev": "crit",
        "title": "The event API does not have you on the roster",
        "body": "ic_hack_me returns registered:false and ic_hack_application_status returns applied:false, "
                "even though you were selected by email, are on Luma, and signed in at the Cloudflare door at 10:18. "
                "ic_hack_submit requires registration and submissions lock 3:00pm Thursday. "
                "Self-serve is a dead end: ic_hack_register refuses (organizer-only) and ic_hack_sign_nda refuses "
                "(not on roster). An organizer has to seat you with ic_hack_register { member_id }.",
        "ticket": True})
if state.get("team_count") == 0 and state.get("api_phase") == "BUILD":
    flags.append({
        "sev": "warn",
        "title": "Zero teams exist in the system, and zero seats are used",
        "body": "Not just you — ic_hack_team_list is empty and ic_hack_get reports seats used:0 during the BUILD phase. "
                "The whole cohort looks unregistered, which means everyone hits the same wall at the Thursday lock.",
        "ticket": True})

# Track which flags have already been reported upstream, so the loop never
# re-files the same ticket every 20 minutes (the feedback endpoint is 10/IP/hour).
rep_path = os.path.join(HERE, "reported.json")
reported = json.load(open(rep_path)) if os.path.exists(rep_path) else {}
new_flags = [f for f in flags if f["title"] not in reported]
for f in flags:
    if f["title"] in reported:
        f["ticket_id"] = reported[f["title"]]

TPL = open(os.path.join(HERE, "template.html")).read()
open(OUT, "w").write(TPL.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False)))
if new_flags:
    print("!! NEW UNREPORTED FLAGS (file feedback for these):")
    for f in new_flags:
        print("   -", f["title"])
print("wrote", OUT, os.path.getsize(OUT), "bytes;", len(sched), "schedule rows,", len(flags), "flags,", len(history), "change events")
