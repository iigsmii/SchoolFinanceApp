#!/usr/bin/env python3
"""Non-mutating replacement for the obsolete text-replacement patch utility."""
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
backend = root / "SchoolFinanceApp_GoogleAppsScript_FINAL.gs"
subprocess.run(["node", "--check"], input=backend.read_bytes(), check=True, cwd=root)
subprocess.run(["node", "tests/backend.test.cjs"], check=True, cwd=root)
subprocess.run(["java", "-Dfile.encoding=UTF-8", "tests/JavaChecks.java"], check=True, cwd=root)
for p in (root / "app/src/main").rglob("*.xml"):
    ET.parse(p)
print("PASS Android resource XML parsing")
print("NOTICE: Android SDK build, device UI tests, and live Apps Script tests must still run before production.")
