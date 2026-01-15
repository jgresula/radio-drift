#!/usr/bin/env python3
"""
Fetch ambient stations from Radio Browser API and generate HTML curation page.

Usage:
    python curate-stations.py

Then open curate-stations.html in a browser.
"""

import json
import urllib.request
import urllib.parse
from pathlib import Path

API_URL = "https://de2.api.radio-browser.info/json/stations/bytag/ambient"
PARAMS = {
    "hidebroken": "true",
    "order": "clickcount",
    "reverse": "true",
    "limit": "500"
}

SCRIPT_DIR = Path(__file__).parent
OUTPUT_HTML = SCRIPT_DIR / "curate-stations.html"
EXISTING_JSON = SCRIPT_DIR.parent / "ambient-stations.json"


def fetch_stations():
    """Fetch ambient stations from Radio Browser API."""
    query_string = urllib.parse.urlencode(PARAMS)
    url = f"{API_URL}?{query_string}"
    print(f"Fetching stations from {url}...")

    req = urllib.request.Request(url, headers={"User-Agent": "RadioDrift/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read().decode("utf-8")
        stations = json.loads(data)

    print(f"Fetched {len(stations)} stations")
    return stations


def load_existing():
    """Load existing curated station UUIDs."""
    if EXISTING_JSON.exists():
        with open(EXISTING_JSON) as f:
            existing = json.load(f)
            return {s["stationuuid"] for s in existing}
    return set()


def generate_html(stations, existing_ids):
    """Generate HTML curation page."""
    html = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Curate Ambient Stations</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 20px;
            background: #1a1a2e;
            color: #e0e0e0;
        }
        h1 { color: #7b8cde; margin-bottom: 0.5rem; }
        .subtitle { color: #888; font-size: 0.9rem; margin-bottom: 1.5rem; }
        .controls {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        input[type="text"] {
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #444;
            background: #2a2a3e;
            color: #e0e0e0;
            width: 300px;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #7b8cde;
        }
        button {
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            background: #7b8cde;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
        }
        button:hover { background: #5a6cbe; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        th, td {
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #333;
        }
        th {
            background: #2a2a3e;
            position: sticky;
            top: 0;
            cursor: pointer;
            user-select: none;
        }
        th:hover { background: #3a3a4e; }
        th.sorted::after { content: ' ▼'; font-size: 0.7em; }
        th.sorted.asc::after { content: ' ▲'; font-size: 0.7em; }
        tr:hover { background: #2a2a3e; }
        .tags {
            font-size: 0.8em;
            color: #888;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .play-btn {
            padding: 4px 10px;
            font-size: 0.85em;
            background: #4a4a6e;
        }
        .play-btn:hover { background: #5a5a7e; }
        .play-btn.playing { background: #e91e63; }
        audio { display: none; }
        .selected-count {
            color: #7b8cde;
            font-weight: 500;
        }
        .checkbox-cell { width: 40px; text-align: center; }
        input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        a { color: #7b8cde; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .listeners {
            color: #888;
            font-size: 0.9em;
        }
        .empty-message {
            text-align: center;
            color: #666;
            padding: 2rem;
        }
    </style>
</head>
<body>
    <h1>Curate Ambient Stations</h1>
    <p class="subtitle">Select stations to include in the curated ambient radio list</p>
    <div class="controls">
        <input type="text" id="search" placeholder="Filter by name or tags...">
        <span class="selected-count">Selected: <span id="count">0</span></span>
        <button onclick="downloadJson()">Download JSON</button>
        <button onclick="selectAll()">Select All Visible</button>
        <button onclick="deselectAll()">Deselect All</button>
    </div>
    <table>
        <thead>
            <tr>
                <th class="checkbox-cell" onclick="sortBy('selected')">☑</th>
                <th onclick="sortBy('name')">Station Name</th>
                <th>Preview</th>
                <th onclick="sortBy('tags')">Tags</th>
                <th onclick="sortBy('clickcount')">Listeners</th>
                <th>Link</th>
            </tr>
        </thead>
        <tbody id="stations"></tbody>
    </table>
    <audio id="audio"></audio>
    <script>
        const stations = STATIONS_JSON;
        const existingIds = EXISTING_IDS;
        let selected = new Set(existingIds);
        let sortKey = 'clickcount';
        let sortReverse = true;
        let currentPlaying = null;
        let currentFilter = '';

        function updateCount() {
            document.getElementById('count').textContent = selected.size;
        }

        function render(filter = '') {
            currentFilter = filter;
            const tbody = document.getElementById('stations');
            const filterLower = filter.toLowerCase();

            let filtered = stations.filter(s =>
                s.name.toLowerCase().includes(filterLower) ||
                (s.tags && s.tags.toLowerCase().includes(filterLower))
            );

            filtered.sort((a, b) => {
                if (sortKey === 'selected') {
                    const asel = selected.has(a.stationuuid) ? 1 : 0;
                    const bsel = selected.has(b.stationuuid) ? 1 : 0;
                    return sortReverse ? bsel - asel : asel - bsel;
                }
                const av = a[sortKey] || '';
                const bv = b[sortKey] || '';
                if (typeof av === 'number') {
                    return sortReverse ? bv - av : av - bv;
                }
                return sortReverse ? bv.toString().localeCompare(av.toString()) : av.toString().localeCompare(bv.toString());
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-message">No stations match your filter</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(s => `
                <tr>
                    <td class="checkbox-cell">
                        <input type="checkbox" ${selected.has(s.stationuuid) ? 'checked' : ''} onchange="toggle('${s.stationuuid}')">
                    </td>
                    <td>${escapeHtml(s.name)}</td>
                    <td><button class="play-btn" onclick="preview('${escapeHtml(s.url_resolved)}', this)">▶</button></td>
                    <td class="tags" title="${escapeHtml(s.tags || '')}">${escapeHtml(s.tags || '')}</td>
                    <td class="listeners">${(s.clickcount || 0).toLocaleString()}</td>
                    <td>${s.homepage ? '<a href="' + escapeHtml(s.homepage) + '" target="_blank">↗</a>' : ''}</td>
                </tr>
            `).join('');

            updateCount();
            updateSortIndicators();
        }

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#039;');
        }

        function toggle(uuid) {
            if (selected.has(uuid)) {
                selected.delete(uuid);
            } else {
                selected.add(uuid);
            }
            updateCount();
        }

        function sortBy(key) {
            if (sortKey === key) {
                sortReverse = !sortReverse;
            } else {
                sortKey = key;
                sortReverse = key === 'clickcount' || key === 'selected';
            }
            render(currentFilter);
        }

        function updateSortIndicators() {
            document.querySelectorAll('th').forEach(th => {
                th.classList.remove('sorted', 'asc');
            });
            const headers = ['selected', 'name', null, 'tags', 'clickcount', null];
            const idx = headers.indexOf(sortKey);
            if (idx >= 0) {
                const th = document.querySelectorAll('th')[idx];
                th.classList.add('sorted');
                if (!sortReverse) th.classList.add('asc');
            }
        }

        function preview(url, btn) {
            const audio = document.getElementById('audio');
            if (currentPlaying === btn) {
                audio.pause();
                btn.textContent = '▶';
                btn.classList.remove('playing');
                currentPlaying = null;
            } else {
                if (currentPlaying) {
                    currentPlaying.textContent = '▶';
                    currentPlaying.classList.remove('playing');
                }
                audio.src = url;
                audio.play().catch(e => {
                    console.error('Playback failed:', e);
                    alert('Could not play this station. It may be offline or blocked.');
                });
                btn.textContent = '⏸';
                btn.classList.add('playing');
                currentPlaying = btn;
            }
        }

        function selectAll() {
            const filterLower = currentFilter.toLowerCase();
            stations.filter(s =>
                s.name.toLowerCase().includes(filterLower) ||
                (s.tags && s.tags.toLowerCase().includes(filterLower))
            ).forEach(s => selected.add(s.stationuuid));
            render(currentFilter);
        }

        function deselectAll() {
            selected.clear();
            render(currentFilter);
        }

        function downloadJson() {
            const data = stations.filter(s => selected.has(s.stationuuid)).map(s => ({
                stationuuid: s.stationuuid,
                name: s.name,
                url_resolved: s.url_resolved,
                tags: s.tags || '',
                homepage: s.homepage || '',
                favicon: s.favicon || '',
                country: s.country || '',
                countrycode: s.countrycode || '',
                codec: s.codec || '',
                bitrate: s.bitrate || 0
            }));

            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'ambient-stations.json';
            a.click();
            URL.revokeObjectURL(a.href);
        }

        document.getElementById('search').addEventListener('input', e => render(e.target.value));

        // Stop audio when page unloads
        window.addEventListener('beforeunload', () => {
            document.getElementById('audio').pause();
        });

        render();
    </script>
</body>
</html>'''

    # Inject data
    html = html.replace('STATIONS_JSON', json.dumps(stations))
    html = html.replace('EXISTING_IDS', json.dumps(list(existing_ids)))

    return html


def main():
    """Main entry point."""
    print("Radio Drift - Station Curation Tool")
    print("=" * 40)

    stations = fetch_stations()
    existing_ids = load_existing()
    print(f"Found {len(existing_ids)} existing curated stations")

    html = generate_html(stations, existing_ids)

    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"\nGenerated: {OUTPUT_HTML}")
    print("\nNext steps:")
    print("1. Open curate-stations.html in your browser")
    print("2. Check/uncheck stations to include")
    print("3. Click 'Download JSON' to save your selection")
    print("4. Copy the downloaded file to ambient-stations.json")


if __name__ == '__main__':
    main()
