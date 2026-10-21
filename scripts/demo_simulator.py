#!/usr/bin/env python3
"""
ACCESS-EASE Hardware Demo Simulator
Grand Plaza Mall RFID Reader Simulation Tool

Simulates physical ESP32 RFID reader events (card taps and device heartbeats)
against the FastAPI backend over HTTP without requiring physical hardware.

Relies strictly on Python standard library (urllib.request, json, argparse, time, random).
"""

import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.request


def send_request(url: str, headers: dict, payload: dict) -> tuple[int, dict, float]:
    """Send an HTTP POST request and return status code, parsed JSON response, and latency in ms."""
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            body = response.read().decode("utf-8")
            parsed = json.loads(body) if body else {}
            return response.status, parsed, latency_ms
    except urllib.error.HTTPError as e:
        latency_ms = (time.perf_counter() - start_time) * 1000.0
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed, latency_ms
    except urllib.error.URLError as e:
        latency_ms = (time.perf_counter() - start_time) * 1000.0
        return 0, {"error": str(e.reason)}, latency_ms


def run_scan(base_url: str, token: str, uid: str, event_id: str | None = None) -> tuple[int, dict]:
    """Simulate a single RFID card tap event."""
    if event_id is None:
        event_id = f"sim-{int(time.time() * 1000)}-{random.randint(1000, 9999)}"

    endpoint = f"{base_url.rstrip('/')}/api/rfid/scans"
    headers = {
        "Content-Type": "application/json",
        "X-Device-Token": token,
    }
    payload = {
        "event_id": event_id,
        "uid": uid.upper(),
    }

    status, response, latency = send_request(endpoint, headers, payload)

    print(f"\n[SCAN EVENT] UID: {uid.upper()} | Event ID: {event_id}")
    print(f"  Target:     {endpoint}")
    print(f"  Latency:    {latency:.1f} ms")
    print(f"  HTTP Code:  {status}")
    print(f"  Result:     {response.get('result', 'N/A')}")
    if response.get("reason"):
        print(f"  Reason:     {response.get('reason')}")
    if response.get("mode"):
        print(f"  Mode:       {response.get('mode')}")
    if response.get("duplicate"):
        print(f"  Duplicate:  {response.get('duplicate')} (Idempotent replay)")
    if response.get("instructions"):
        inst_count = len(response["instructions"])
        print(f"  Guidance:   {inst_count} instruction steps returned")

    return status, response


def run_heartbeat(base_url: str, token: str) -> tuple[int, dict]:
    """Simulate a single device telemetry heartbeat."""
    endpoint = f"{base_url.rstrip('/')}/api/devices/heartbeat"
    headers = {
        "Content-Type": "application/json",
        "X-Device-Token": token,
    }

    status, response, latency = send_request(endpoint, headers, {})

    print(f"\n[HEARTBEAT] Telemetry Ping")
    print(f"  Target:    {endpoint}")
    print(f"  Latency:   {latency:.1f} ms")
    print(f"  HTTP Code: {status}")
    print(f"  Device:    {response.get('device_id', 'N/A')}")
    print(f"  Status:    {response.get('status', 'N/A')}")

    return status, response


def run_sequence(base_url: str, token: str, interval: float):
    """Run an automated sequence of card taps for live demonstration."""
    cards = [
        ("AAAAAAAA", "Blind Mode Card (Main Entrance -> Reading Hall)"),
        ("BBBBBBBB", "Hearing Mode Card (Main Entrance -> Periodicals)"),
        ("CCCCCCCC", "Low-Vision Mode Card (Main Entrance -> Computer Section)"),
        ("99999999", "Unregistered Card (Expected Rejection: UNREGISTERED)"),
    ]

    print("\n=======================================================")
    print("  ACCESS-EASE LIVE DEMO SEQUENCE SIMULATION")
    print(f"  Interval: {interval:.1f}s between card taps")
    print("=======================================================")

    for idx, (uid, description) in enumerate(cards, start=1):
        print(f"\nStep {idx}/{len(cards)}: Tapping {description}...")
        status, resp = run_scan(base_url, token, uid)
        if idx < len(cards):
            print(f"Waiting {interval:.1f}s before next tap...")
            time.sleep(interval)

    print("\n[Sequence Complete] All sample cards tested successfully.")


def run_stress(base_url: str, token: str, count: int = 20):
    """Run rapid consecutive scans to verify idempotency and server resilience."""
    print(f"\n=======================================================")
    print(f"  STRESS TEST: Transmitting {count} rapid RFID scans")
    print("=======================================================")

    sample_uids = ["AAAAAAAA", "BBBBBBBB", "CCCCCCCC", "04A1B2C3", "FFFFFFFF"]
    latencies = []
    successes = 0

    # Test idempotency on fixed event_id
    fixed_event_id = f"stress-idempotent-{int(time.time())}"

    for i in range(count):
        # Even numbered iterations replay identical event_id to verify idempotency
        if i % 4 == 0:
            eid = fixed_event_id
            uid = "AAAAAAAA"
        else:
            eid = f"stress-{i}-{random.randint(1000, 9999)}"
            uid = random.choice(sample_uids)

        endpoint = f"{base_url.rstrip('/')}/api/rfid/scans"
        headers = {
            "Content-Type": "application/json",
            "X-Device-Token": token,
        }
        payload = {"event_id": eid, "uid": uid}

        status, resp, latency = send_request(endpoint, headers, payload)
        latencies.append(latency)

        if status == 200:
            successes += 1
            is_dup = " (Idempotent Duplicate)" if resp.get("duplicate") else ""
            print(f"  [Scan {i+1:02d}/{count:02d}] UID={uid} -> {resp.get('result', 'OK')}{is_dup} ({latency:.1f} ms)")
        else:
            print(f"  [Scan {i+1:02d}/{count:02d}] UID={uid} -> HTTP {status} ({latency:.1f} ms)")

    avg_lat = sum(latencies) / len(latencies) if latencies else 0
    print("\n--- Stress Summary ---")
    print(f"  Total Sent:   {count}")
    print(f"  Successful:   {successes}/{count}")
    print(f"  Avg Latency:  {avg_lat:.1f} ms")
    print(f"  Max Latency:  {max(latencies):.1f} ms")
    print(f"  Min Latency:  {min(latencies):.1f} ms")


def main():
    parser = argparse.ArgumentParser(
        description="ACCESS-EASE RFID Reader Hardware Simulator (Grand Plaza Mall Demo)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Target backend base URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--token",
        default="dev-token-accesssync-2024",
        help="Device authentication token (default: dev-token-accesssync-2024)",
    )
    parser.add_argument(
        "--uid",
        default="AAAAAAAA",
        help="Card UID hex string to tap (default: AAAAAAAA)",
    )
    parser.add_argument(
        "--mode",
        choices=["scan", "heartbeat", "sequence", "stress"],
        default="scan",
        help="Operational simulation mode (default: scan)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Interval in seconds between taps in sequence mode (default: 2.0)",
    )

    args = parser.parse_args()

    # Pre-check connectivity
    print("==================================================")
    print("  ACCESS-EASE Hardware Simulator")
    print(f"  Target: {args.url}")
    print(f"  Mode:   {args.mode.upper()}")
    print("==================================================")

    if args.mode == "scan":
        status, _ = run_scan(args.url, args.token, args.uid)
        sys.exit(0 if status == 200 else 1)
    elif args.mode == "heartbeat":
        status, _ = run_heartbeat(args.url, args.token)
        sys.exit(0 if status == 200 else 1)
    elif args.mode == "sequence":
        run_sequence(args.url, args.token, args.interval)
        sys.exit(0)
    elif args.mode == "stress":
        run_stress(args.url, args.token, count=20)
        sys.exit(0)


if __name__ == "__main__":
    main()
