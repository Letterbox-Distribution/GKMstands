import json
import os
from pathlib import Path
from flask import Flask, render_template, jsonify

ROOT = Path(__file__).parent
app = Flask(__name__)


def map_key():
    config = ROOT / 'config.local.json'
    local = json.loads(config.read_text()) if config.exists() else {}
    return os.environ.get('OS_MAPS_API_KEY', local.get('OS_MAPS_API_KEY', ''))


@app.get('/')
def index():
    venues = json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8'))
    return render_template('index.html', venues=venues, os_key=map_key())


@app.get('/api/venues')
def inventory():
    return jsonify(json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8')))


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
