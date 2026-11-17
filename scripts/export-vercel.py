"""Write a static homepage Vercel can serve without Flask."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from flask import render_template

from app import ROOT, STYLE_FILES, app, versioned_asset

css = "\n".join((ROOT / "static" / name).read_text(encoding="utf-8-sig") for name in STYLE_FILES)
css = re.sub(
    r"url\((/static/vendor/[^)]+\.woff2)\)",
    lambda match: "url(" + versioned_asset(match.group(1)[8:]) + ")",
    css,
)
(ROOT / "static" / "site.css").write_text(css, encoding="utf-8")

venues = json.loads((ROOT / "data" / "venues.json").read_text(encoding="utf-8"))
with app.app_context():
    html = render_template(
        "index.html",
        venues=venues,
        os_key="",
        showcase=True,
        showcase_styles="/static/site.css",
        font_url=versioned_asset("vendor/manrope-0.woff2"),
    )
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"Wrote index.html ({len(html)} bytes) and static/site.css ({len(css)} bytes)")
