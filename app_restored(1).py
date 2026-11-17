import json
import os
from pathlib import Path
from flask import Flask, render_template, jsonify, request
ROOT = Path(__file__).parent
app = Flask(__name__)
app.config.update(TEMPLATES_AUTO_RELOAD=True, SEND_FILE_MAX_AGE_DEFAULT=0)
def map_key():
    config = ROOT / 'config.local.json'
    local = json.loads(config.read_text()) if config.exists() else {}
    return os.environ.get('OS_MAPS_API_KEY', local.get('OS_MAPS_API_KEY', ''))
@app.get('/')
def index():
    venues = json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8'))
    showcase = request.args.get('view', os.environ.get('GKM_HOME_VIEW', 'showcase')) != 'original'
    return render_template('index.html', venues=venues, os_key=map_key(), showcase=showcase)
@app.get('/api/venues')
def inventory():
    return jsonify(json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8')))
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
