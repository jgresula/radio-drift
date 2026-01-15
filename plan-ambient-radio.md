# Implementation Plan: Ambient Radio

Based on `design-ambient-radio.md`. Focus on code reuse.

---

## Phase 1: Refactor for Reuse

Extract shared logic into reusable functions before adding new features.

### 1.1 Generic Blacklist Functions

Current code uses hardcoded `BLACKLIST_KEY`. Refactor to accept a key parameter:

```javascript
// Before
function getBlacklist() { ... localStorage.getItem(BLACKLIST_KEY) ... }
function isStationBlacklisted(stationId) { ... }
function blacklistStation(stationId) { ... }

// After
function getBlacklist(key) { ... localStorage.getItem(key) ... }
function saveBlacklist(key, blacklist) { ... }
function isStationBlacklisted(key, stationId) { ... }
function blacklistStation(key, stationId, onUpdate) { ... }
```

Update all existing calls to pass `BLACKLIST_KEY`.

### 1.2 Generic Favorites Functions

Same pattern - add key parameter:

```javascript
// Before
function getFavorites() { ... localStorage.getItem(FAVORITES_KEY) ... }

// After
function getFavorites(key) { ... localStorage.getItem(key) ... }
function saveFavorites(key, favorites) { ... }
function isStationFavorite(key, stationId) { ... }
```

Update all existing calls to pass `FAVORITES_KEY`.

### 1.3 Station Info Renderer

Extract station info modal content generation:

```javascript
function renderStationInfoContent(station) {
    // Returns HTML string for station info modal
    // Currently inline in showStationInfo()
}
```

---

## Phase 2: Rename Radio Roulette

### 2.1 UI Label Change

In HTML, change:
```html
<span class="channel-title">Ambient Radio</span>
```
to:
```html
<span class="channel-title">Radio Roulette</span>
```

### 2.2 Footer Update

Update footer text to reflect rename.

**No localStorage key changes needed** - existing user data preserved.

---

## Phase 3: Data Structure & Loading

### 3.1 Create `ambient-stations.json`

Create empty starter file:
```json
[]
```

### 3.2 Add Constants

```javascript
const CURATED_STATIONS_FILE = 'ambient-stations.json';
const CURATED_BLACKLIST_KEY = 'ambientCuratedBlacklist';
const CURATED_FAVORITES_KEY = 'ambientCuratedFavorites';
const CURATED_SELECTED_KEY = 'ambientCuratedSelected';
```

### 3.3 Add State Variables

```javascript
let curatedStations = [];
let curatedAudio = null;
let currentCuratedStation = null;
let curatedStopping = false;
let curatedMuted = false;
let curatedShuffledPlaylist = [];
let curatedPlaylistIndex = 0;
```

### 3.4 Load Curated Stations

```javascript
async function loadCuratedStations() {
    try {
        const response = await fetch(CURATED_STATIONS_FILE);
        if (!response.ok) throw new Error('Failed to load');
        curatedStations = await response.json();
        createCuratedShuffledPlaylist();
        updateCuratedDisplay();
    } catch (err) {
        console.error('Error loading curated stations:', err);
        curatedStations = [];
    }
}

function createCuratedShuffledPlaylist() {
    const indexes = curatedStations.map((_, i) => i);
    curatedShuffledPlaylist = shuffleArray(indexes);
    curatedPlaylistIndex = 0;
}
```

---

## Phase 4: HTML Structure

### 4.1 Add Ambient Radio Channel

Insert new channel after Radio Roulette channel (copy structure):

```html
<!-- Ambient Radio Channel (Curated) -->
<div class="channel" id="curated-channel">
    <div class="channel-header" data-channel="curated">
        <div class="channel-header-left">
            <span class="channel-toggle">&#9660;</span>
            <span class="channel-title">Ambient Radio</span>
        </div>
        <span class="channel-status" id="curated-status">Stopped</span>
    </div>
    <div class="channel-content">
        <div class="tag-row">
            <button class="tag-btn" id="curated-station-btn" title="Select station">
                <span id="current-curated-station">Select station</span>
                <span>&#9662;</span>
            </button>
        </div>
        <div class="now-playing-row">
            <div class="now-playing" id="curated-now-playing">Click play to start</div>
            <div class="now-playing-actions">
                <button id="curated-favorite" title="Add to favorites"><!-- heart svg --></button>
                <button id="curated-info" title="Station info"><!-- info svg --></button>
            </div>
        </div>
        <div class="now-playing-meta" id="curated-meta"></div>
        <div class="controls">
            <button id="curated-toggle" title="Play/Pause">&#9654;</button>
            <button id="curated-mute" class="btn-small" title="Mute"><!-- speaker svg --></button>
            <div class="volume-container">
                <input type="range" class="volume-slider" id="curated-volume" min="0" max="100" value="70">
                <span class="volume-value" id="curated-volume-value">70%</span>
            </div>
        </div>
        <div class="button-row">
            <button class="shuffle-btn" id="curated-shuffle"><!-- shuffle svg --> Random Station</button>
            <button class="favorites-btn" id="curated-open-favorites" title="Manage favorites"><!-- bookmark svg --></button>
        </div>
    </div>
</div>
```

### 4.2 Add Station Selection Modal

```html
<!-- Curated Station Selection Modal -->
<div class="modal-overlay" id="curated-station-modal">
    <div class="modal">
        <div class="modal-header">
            <span class="modal-title">Select Station</span>
            <button class="modal-close" id="curated-station-modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <input type="text" class="search-input" id="curated-station-search" placeholder="Search stations...">
            <div id="curated-favorites-section" style="display: none;">
                <div class="section-label">Favorites</div>
                <div class="tag-list" id="curated-favorites-list"></div>
            </div>
            <div class="section-label" id="curated-all-label">All Stations</div>
            <div class="tag-list" id="curated-station-list"></div>
        </div>
    </div>
</div>
```

### 4.3 Add Curated Favorites Modal

```html
<!-- Curated Favorites Modal -->
<div class="modal-overlay" id="curated-favorites-modal">
    <div class="modal">
        <div class="modal-header">
            <span class="modal-title">Favorite Stations</span>
            <button class="modal-close" id="curated-favorites-modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="favorites-list" id="curated-favorites-manage-list"></div>
        </div>
        <div class="modal-footer">
            <button id="curated-import-favorites">Import</button>
            <button id="curated-export-favorites">Export</button>
        </div>
    </div>
</div>
```

### 4.4 CSS Addition

Add `.section-label` style for favorites/all stations dividers:

```css
.section-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #666;
    padding: 0.5rem 0;
    margin-top: 0.5rem;
}

.section-label:first-child {
    margin-top: 0;
}

.tag-item.offline {
    opacity: 0.5;
}

.tag-item.offline::after {
    content: 'offline';
    font-size: 0.6rem;
    color: #f44336;
    margin-left: auto;
    padding-left: 0.5rem;
}
```

---

## Phase 5: DOM Elements & Event Listeners

### 5.1 Add DOM Element References

```javascript
// Curated channel elements
const curatedToggleBtn = document.getElementById('curated-toggle');
const curatedShuffleBtn = document.getElementById('curated-shuffle');
const curatedVolumeSlider = document.getElementById('curated-volume');
const curatedVolumeValue = document.getElementById('curated-volume-value');
const curatedStatus = document.getElementById('curated-status');
const curatedNowPlaying = document.getElementById('curated-now-playing');
const curatedMeta = document.getElementById('curated-meta');
const curatedFavoriteBtn = document.getElementById('curated-favorite');
const curatedInfoBtn = document.getElementById('curated-info');
const curatedMuteBtn = document.getElementById('curated-mute');
const curatedStationBtn = document.getElementById('curated-station-btn');
const currentCuratedStationSpan = document.getElementById('current-curated-station');

// Curated modals
const curatedStationModal = document.getElementById('curated-station-modal');
const curatedStationModalClose = document.getElementById('curated-station-modal-close');
const curatedStationSearch = document.getElementById('curated-station-search');
const curatedStationList = document.getElementById('curated-station-list');
const curatedFavoritesList = document.getElementById('curated-favorites-list');
const curatedFavoritesSection = document.getElementById('curated-favorites-section');

const curatedFavoritesModal = document.getElementById('curated-favorites-modal');
const curatedFavoritesModalClose = document.getElementById('curated-favorites-modal-close');
const curatedFavoritesManageList = document.getElementById('curated-favorites-manage-list');
const curatedOpenFavoritesBtn = document.getElementById('curated-open-favorites');
const curatedImportFavoritesBtn = document.getElementById('curated-import-favorites');
const curatedExportFavoritesBtn = document.getElementById('curated-export-favorites');
```

### 5.2 Add Event Listeners

```javascript
// Curated channel controls
curatedToggleBtn.addEventListener('click', toggleCurated);
curatedShuffleBtn.addEventListener('click', playCuratedRandom);
curatedMuteBtn.addEventListener('click', toggleCuratedMute);
curatedFavoriteBtn.addEventListener('click', toggleCuratedFavorite);
curatedInfoBtn.addEventListener('click', showCuratedStationInfo);

// Curated volume
curatedVolumeSlider.addEventListener('input', (e) => {
    curatedVolumeValue.textContent = `${e.target.value}%`;
    updateVolumes();
    saveVolumeSettings();
});

// Curated station selection modal
curatedStationBtn.addEventListener('click', openCuratedStationModal);
curatedStationModalClose.addEventListener('click', closeCuratedStationModal);
curatedStationSearch.addEventListener('input', (e) => renderCuratedStationList(e.target.value));

// Curated favorites modal
curatedOpenFavoritesBtn.addEventListener('click', openCuratedFavoritesModal);
curatedFavoritesModalClose.addEventListener('click', closeCuratedFavoritesModal);
curatedImportFavoritesBtn.addEventListener('click', () => importFavoritesGeneric(CURATED_FAVORITES_KEY, renderCuratedFavorites));
curatedExportFavoritesBtn.addEventListener('click', () => exportFavoritesGeneric(CURATED_FAVORITES_KEY, 'ambient-radio-favorites.json'));

// Close modals on overlay click
curatedStationModal.addEventListener('click', (e) => {
    if (e.target === curatedStationModal) closeCuratedStationModal();
});
curatedFavoritesModal.addEventListener('click', (e) => {
    if (e.target === curatedFavoritesModal) closeCuratedFavoritesModal();
});
```

---

## Phase 6: Playback Logic

### 6.1 Play Curated Station (Manual Selection)

```javascript
function playCuratedStation(station) {
    if (curatedAudio) {
        curatedAudio.pause();
        curatedAudio.src = '';
    }

    currentCuratedStation = station;
    localStorage.setItem(CURATED_SELECTED_KEY, station.stationuuid);
    curatedNowPlaying.textContent = station.name || 'Unknown Station';
    curatedMeta.textContent = '';
    curatedStatus.textContent = 'Connecting...';
    curatedStatus.className = 'channel-status loading';
    updateCuratedFavoriteButton();
    updateCuratedStationDisplay();

    const newAudio = new Audio();
    curatedAudio = newAudio;
    curatedStopping = false;
    newAudio.crossOrigin = 'anonymous';
    updateVolumes();

    newAudio.addEventListener('playing', () => {
        if (curatedAudio !== newAudio) return;
        curatedStatus.textContent = 'Playing';
        curatedStatus.className = 'channel-status playing';
        curatedToggleBtn.innerHTML = '&#10074;&#10074;';
    });

    newAudio.addEventListener('error', (e) => {
        if (curatedAudio !== newAudio || curatedStopping) return;
        console.error('Curated playback error:', e);
        // Manual selection: show error, don't auto-skip
        blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
        curatedStatus.textContent = 'Unavailable';
        curatedStatus.className = 'channel-status error';
        curatedNowPlaying.textContent = 'Station offline - try another';
    });

    newAudio.src = station.url_resolved;
    newAudio.play().catch(err => {
        if (curatedAudio !== newAudio) return;
        console.error('Curated play failed:', err);
        blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
        curatedStatus.textContent = 'Unavailable';
        curatedStatus.className = 'channel-status error';
        curatedNowPlaying.textContent = 'Station offline - try another';
    });
}
```

### 6.2 Play Curated Random (Auto-skip on Error)

```javascript
function playCuratedRandom() {
    const available = getAvailableCuratedStations();
    if (available.length === 0) {
        curatedStatus.textContent = 'No stations available';
        curatedStatus.className = 'channel-status error';
        curatedNowPlaying.textContent = 'All stations offline';
        return;
    }

    playCuratedNext();
}

function playCuratedNext() {
    let attempts = 0;
    while (attempts < curatedStations.length) {
        const stationIndex = curatedShuffledPlaylist[curatedPlaylistIndex];
        const station = curatedStations[stationIndex];
        curatedPlaylistIndex = (curatedPlaylistIndex + 1) % curatedShuffledPlaylist.length;

        if (!isStationBlacklisted(CURATED_BLACKLIST_KEY, station.stationuuid)) {
            playCuratedStationWithAutoRetry(station);
            return;
        }
        attempts++;
    }

    curatedStatus.textContent = 'No stations available';
    curatedStatus.className = 'channel-status error';
    curatedNowPlaying.textContent = 'All stations offline';
}

function playCuratedStationWithAutoRetry(station) {
    // Similar to playCuratedStation but auto-skips on error
    if (curatedAudio) {
        curatedAudio.pause();
        curatedAudio.src = '';
    }

    currentCuratedStation = station;
    localStorage.setItem(CURATED_SELECTED_KEY, station.stationuuid);
    curatedNowPlaying.textContent = station.name || 'Unknown Station';
    curatedMeta.textContent = '';
    curatedStatus.textContent = 'Connecting...';
    curatedStatus.className = 'channel-status loading';
    updateCuratedFavoriteButton();
    updateCuratedStationDisplay();

    const newAudio = new Audio();
    curatedAudio = newAudio;
    curatedStopping = false;
    newAudio.crossOrigin = 'anonymous';
    updateVolumes();

    newAudio.addEventListener('playing', () => {
        if (curatedAudio !== newAudio) return;
        curatedStatus.textContent = 'Playing';
        curatedStatus.className = 'channel-status playing';
        curatedToggleBtn.innerHTML = '&#10074;&#10074;';
    });

    newAudio.addEventListener('error', (e) => {
        if (curatedAudio !== newAudio || curatedStopping) return;
        console.error('Curated playback error (auto-retry):', e);
        // Random play: silent auto-skip
        blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
        playCuratedNext();
    });

    newAudio.src = station.url_resolved;
    newAudio.play().catch(err => {
        if (curatedAudio !== newAudio) return;
        console.error('Curated play failed (auto-retry):', err);
        blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
        playCuratedNext();
    });
}
```

### 6.3 Helper Functions

```javascript
function getAvailableCuratedStations() {
    return curatedStations.filter(s => !isStationBlacklisted(CURATED_BLACKLIST_KEY, s.stationuuid));
}

function stopCurated() {
    curatedStopping = true;
    if (curatedAudio) {
        curatedAudio.pause();
    }
    curatedStatus.textContent = 'Paused';
    curatedStatus.className = 'channel-status';
    curatedToggleBtn.innerHTML = '&#9654;';
}

function toggleCurated() {
    if (curatedAudio && !curatedAudio.paused) {
        stopCurated();
    } else if (curatedAudio && curatedAudio.src) {
        curatedStopping = false;
        curatedAudio.play().catch(() => playCuratedRandom());
    } else {
        playCuratedRandom();
    }
}

function toggleCuratedMute() {
    curatedMuted = !curatedMuted;
    curatedMuteBtn.innerHTML = curatedMuted ? speakerOffSvg : speakerOnSvg;
    updateVolumes();
}

function updateCuratedStationDisplay() {
    const count = getAvailableCuratedStations().length;
    const total = curatedStations.length;
    if (currentCuratedStation) {
        currentCuratedStationSpan.textContent = currentCuratedStation.name;
    } else if (total > 0) {
        currentCuratedStationSpan.textContent = `${count} stations`;
    } else {
        currentCuratedStationSpan.textContent = 'No stations';
    }
}
```

---

## Phase 7: Station Selection Modal

### 7.1 Modal Functions

```javascript
function openCuratedStationModal() {
    curatedStationSearch.value = '';
    renderCuratedStationList('');
    curatedStationModal.classList.add('active');
    curatedStationSearch.focus();
}

function closeCuratedStationModal() {
    curatedStationModal.classList.remove('active');
}

function renderCuratedStationList(filter = '') {
    const favorites = getFavorites(CURATED_FAVORITES_KEY);
    const filterLower = filter.toLowerCase();

    // Filter stations
    const filteredStations = curatedStations.filter(s =>
        s.name.toLowerCase().includes(filterLower) ||
        (s.tags && s.tags.toLowerCase().includes(filterLower))
    );

    // Render favorites section (if any match filter)
    const filteredFavorites = favorites.filter(f =>
        f.name.toLowerCase().includes(filterLower) ||
        (f.tags && f.tags.toLowerCase().includes(filterLower))
    );

    if (filteredFavorites.length > 0) {
        curatedFavoritesSection.style.display = 'block';
        curatedFavoritesList.innerHTML = filteredFavorites.map(fav => {
            const isOffline = isStationBlacklisted(CURATED_BLACKLIST_KEY, fav.stationuuid);
            return `
                <div class="tag-item ${isOffline ? 'offline' : ''}" data-uuid="${fav.stationuuid}">
                    <span class="tag-name">${fav.name}</span>
                </div>
            `;
        }).join('');
    } else {
        curatedFavoritesSection.style.display = 'none';
    }

    // Render all stations (excluding favorites shown above)
    const favoriteIds = new Set(favorites.map(f => f.stationuuid));
    const nonFavoriteStations = filteredStations.filter(s => !favoriteIds.has(s.stationuuid));

    curatedStationList.innerHTML = nonFavoriteStations.map(station => {
        const isOffline = isStationBlacklisted(CURATED_BLACKLIST_KEY, station.stationuuid);
        const isSelected = currentCuratedStation && currentCuratedStation.stationuuid === station.stationuuid;
        return `
            <div class="tag-item ${isSelected ? 'selected' : ''} ${isOffline ? 'offline' : ''}" data-uuid="${station.stationuuid}">
                <span class="tag-name">${station.name}</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    curatedFavoritesList.querySelectorAll('.tag-item').forEach(item => {
        item.addEventListener('click', () => selectCuratedStation(item.dataset.uuid));
    });
    curatedStationList.querySelectorAll('.tag-item').forEach(item => {
        item.addEventListener('click', () => selectCuratedStation(item.dataset.uuid));
    });
}

function selectCuratedStation(uuid) {
    const station = curatedStations.find(s => s.stationuuid === uuid) ||
                    getFavorites(CURATED_FAVORITES_KEY).find(f => f.stationuuid === uuid);
    if (station) {
        playCuratedStation(station);
        closeCuratedStationModal();
    }
}
```

---

## Phase 8: Favorites & Station Info

### 8.1 Curated Favorites

```javascript
function toggleCuratedFavorite() {
    if (!currentCuratedStation) return;
    const favorites = getFavorites(CURATED_FAVORITES_KEY);
    const index = favorites.findIndex(f => f.stationuuid === currentCuratedStation.stationuuid);

    if (index >= 0) {
        favorites.splice(index, 1);
        curatedFavoriteBtn.innerHTML = heartOutlineSvg;
        curatedFavoriteBtn.classList.remove('active');
    } else {
        favorites.push({
            stationuuid: currentCuratedStation.stationuuid,
            name: currentCuratedStation.name,
            url_resolved: currentCuratedStation.url_resolved,
            tags: currentCuratedStation.tags
        });
        curatedFavoriteBtn.innerHTML = heartFilledSvg;
        curatedFavoriteBtn.classList.add('active');
    }
    saveFavorites(CURATED_FAVORITES_KEY, favorites);
}

function updateCuratedFavoriteButton() {
    if (currentCuratedStation && isStationFavorite(CURATED_FAVORITES_KEY, currentCuratedStation.stationuuid)) {
        curatedFavoriteBtn.innerHTML = heartFilledSvg;
        curatedFavoriteBtn.classList.add('active');
    } else {
        curatedFavoriteBtn.innerHTML = heartOutlineSvg;
        curatedFavoriteBtn.classList.remove('active');
    }
}

function openCuratedFavoritesModal() {
    renderCuratedFavorites();
    curatedFavoritesModal.classList.add('active');
}

function closeCuratedFavoritesModal() {
    curatedFavoritesModal.classList.remove('active');
}

function renderCuratedFavorites() {
    const favorites = getFavorites(CURATED_FAVORITES_KEY);
    if (favorites.length === 0) {
        curatedFavoritesManageList.innerHTML = '<div class="empty-message">No favorites yet</div>';
        return;
    }
    curatedFavoritesManageList.innerHTML = favorites.map((fav, i) => `
        <div class="favorite-item">
            <div class="favorite-info">
                <div class="favorite-name">${fav.name}</div>
                <div class="favorite-tag">${fav.tags || ''}</div>
            </div>
            <div class="favorite-actions">
                <button onclick="playCuratedFavorite(${i})" title="Play">&#9654;</button>
                <button onclick="removeCuratedFavorite(${i})" title="Remove">&#10005;</button>
            </div>
        </div>
    `).join('');
}

function playCuratedFavorite(index) {
    const favorites = getFavorites(CURATED_FAVORITES_KEY);
    const fav = favorites[index];
    if (!fav) return;
    playCuratedStation(fav);
    closeCuratedFavoritesModal();
}

function removeCuratedFavorite(index) {
    const favorites = getFavorites(CURATED_FAVORITES_KEY);
    favorites.splice(index, 1);
    saveFavorites(CURATED_FAVORITES_KEY, favorites);
    renderCuratedFavorites();
    updateCuratedFavoriteButton();
}
```

### 8.2 Curated Station Info

```javascript
function showCuratedStationInfo() {
    if (!currentCuratedStation) return;
    // Reuse existing station info modal with same rendering logic
    showStationInfoGeneric(currentCuratedStation);
}
```

---

## Phase 9: Volume Integration

### 9.1 Update Volume Functions

Update `updateVolumes()`:

```javascript
function updateVolumes() {
    const effectiveMaster = masterMuted ? 0 : masterVolume;
    // ... existing radio, space, atc volume code ...

    // Add curated channel
    if (curatedAudio) {
        const curatedVol = curatedMuted ? 0 : (curatedVolumeSlider.value / 100);
        curatedAudio.volume = curatedVol * effectiveMaster;
    }
}
```

Update `getVolumeSettings()` and `saveVolumeSettings()`:

```javascript
function getVolumeSettings() {
    try {
        return JSON.parse(localStorage.getItem(VOLUME_SETTINGS_KEY)) ||
            { master: 100, radio: 70, atc: 50, space: 40, curated: 70 };
    } catch {
        return { master: 100, radio: 70, atc: 50, space: 40, curated: 70 };
    }
}

function saveVolumeSettings() {
    const settings = {
        master: parseInt(masterVolumeSlider.value),
        radio: parseInt(radioVolumeSlider.value),
        atc: parseInt(atcVolumeSlider.value),
        space: parseInt(spaceVolumeSlider.value),
        curated: parseInt(curatedVolumeSlider.value)
    };
    localStorage.setItem(VOLUME_SETTINGS_KEY, JSON.stringify(settings));
}

function loadVolumeSettings() {
    const settings = getVolumeSettings();
    // ... existing code ...
    curatedVolumeSlider.value = settings.curated;
    curatedVolumeValue.textContent = `${settings.curated}%`;
}
```

---

## Phase 10: Channel Collapse Integration

Update channel collapse handling to include curated channel:

```javascript
// In getCollapsedChannels() default:
{ radio: false, atc: false, space: true, curated: false }

// Add click handler for curated channel header
document.querySelector('#curated-channel .channel-header').addEventListener('click', () => {
    toggleChannelCollapse('curated');
});
```

---

## Phase 11: Initialization

Update initialization to load curated stations:

```javascript
// In init() or DOMContentLoaded:
await loadCuratedStations();

// Restore last selected curated station (optional)
const lastCuratedUuid = localStorage.getItem(CURATED_SELECTED_KEY);
if (lastCuratedUuid) {
    const station = curatedStations.find(s => s.stationuuid === lastCuratedUuid);
    if (station) {
        currentCuratedStation = station;
        updateCuratedStationDisplay();
    }
}
```

---

## Phase 12: Admin Tool

### 12.1 Create Directory Structure

```
admin/
  curate-stations.py
  (curate-stations.html - generated)
```

### 12.2 Python Script (`admin/curate-stations.py`)

```python
#!/usr/bin/env python3
"""
Fetch ambient stations from Radio Browser API and generate HTML curation page.

Usage:
    python curate-stations.py

Then open curate-stations.html in a browser.
"""

import json
import requests
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
    print(f"Fetching stations from {API_URL}...")
    response = requests.get(API_URL, params=PARAMS, timeout=30)
    response.raise_for_status()
    stations = response.json()
    print(f"Fetched {len(stations)} stations")
    return stations

def load_existing():
    if EXISTING_JSON.exists():
        with open(EXISTING_JSON) as f:
            existing = json.load(f)
            return {s['stationuuid'] for s in existing}
    return set()

def generate_html(stations, existing_ids):
    # HTML template with embedded JS for interactivity
    html = '''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Curate Ambient Stations</title>
    <style>
        body { font-family: -apple-system, sans-serif; margin: 20px; background: #1a1a2e; color: #e0e0e0; }
        h1 { color: #7b8cde; }
        .controls { margin-bottom: 20px; display: flex; gap: 10px; align-items: center; }
        input[type="text"] { padding: 8px; border-radius: 4px; border: 1px solid #444; background: #2a2a3e; color: #e0e0e0; width: 300px; }
        button { padding: 8px 16px; border-radius: 4px; border: none; background: #7b8cde; color: white; cursor: pointer; }
        button:hover { background: #5a6cbe; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        th { background: #2a2a3e; position: sticky; top: 0; cursor: pointer; }
        th:hover { background: #3a3a4e; }
        tr:hover { background: #2a2a3e; }
        .tags { font-size: 0.8em; color: #888; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
        .play-btn { padding: 4px 8px; font-size: 0.8em; }
        audio { display: none; }
        .selected-count { color: #7b8cde; }
    </style>
</head>
<body>
    <h1>Curate Ambient Stations</h1>
    <div class="controls">
        <input type="text" id="search" placeholder="Filter by name or tags...">
        <span class="selected-count">Selected: <span id="count">0</span></span>
        <button onclick="downloadJson()">Download JSON</button>
    </div>
    <table>
        <thead>
            <tr>
                <th onclick="sortBy('selected')">☑</th>
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

        function render(filter = '') {
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

            tbody.innerHTML = filtered.map(s => `
                <tr>
                    <td><input type="checkbox" ${selected.has(s.stationuuid) ? 'checked' : ''} onchange="toggle('${s.stationuuid}')"></td>
                    <td>${s.name}</td>
                    <td><button class="play-btn" onclick="preview('${s.url_resolved}', this)">▶</button></td>
                    <td class="tags">${s.tags || ''}</td>
                    <td>${s.clickcount || 0}</td>
                    <td>${s.homepage ? `<a href="${s.homepage}" target="_blank">↗</a>` : ''}</td>
                </tr>
            `).join('');

            updateCount();
        }

        function toggle(uuid) {
            if (selected.has(uuid)) {
                selected.delete(uuid);
            } else {
                selected.add(uuid);
            }
            updateCount();
        }

        function updateCount() {
            document.getElementById('count').textContent = selected.size;
        }

        function sortBy(key) {
            if (sortKey === key) {
                sortReverse = !sortReverse;
            } else {
                sortKey = key;
                sortReverse = true;
            }
            render(document.getElementById('search').value);
        }

        function preview(url, btn) {
            const audio = document.getElementById('audio');
            if (currentPlaying === btn) {
                audio.pause();
                btn.textContent = '▶';
                currentPlaying = null;
            } else {
                if (currentPlaying) currentPlaying.textContent = '▶';
                audio.src = url;
                audio.play();
                btn.textContent = '⏸';
                currentPlaying = btn;
            }
        }

        function downloadJson() {
            const data = stations.filter(s => selected.has(s.stationuuid)).map(s => ({
                stationuuid: s.stationuuid,
                name: s.name,
                url_resolved: s.url_resolved,
                tags: s.tags,
                homepage: s.homepage,
                favicon: s.favicon,
                country: s.country,
                countrycode: s.countrycode,
                codec: s.codec,
                bitrate: s.bitrate
            }));

            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'ambient-stations.json';
            a.click();
        }

        document.getElementById('search').addEventListener('input', e => render(e.target.value));
        render();
    </script>
</body>
</html>'''

    # Inject data
    html = html.replace('STATIONS_JSON', json.dumps(stations))
    html = html.replace('EXISTING_IDS', json.dumps(list(existing_ids)))

    return html

def main():
    stations = fetch_stations()
    existing_ids = load_existing()
    print(f"Found {len(existing_ids)} existing curated stations")

    html = generate_html(stations, existing_ids)

    with open(OUTPUT_HTML, 'w') as f:
        f.write(html)

    print(f"Generated {OUTPUT_HTML}")
    print(f"Open in browser to curate stations")

if __name__ == '__main__':
    main()
```

---

## Implementation Order

1. **Phase 1**: Refactor blacklist/favorites functions (enables code reuse)
2. **Phase 2**: Rename Radio Roulette (quick, non-breaking)
3. **Phase 3**: Data structure & constants
4. **Phase 4**: HTML structure (channel + modals)
5. **Phase 5**: DOM elements & event listeners
6. **Phase 6**: Playback logic
7. **Phase 7**: Station selection modal with search
8. **Phase 8**: Favorites & station info
9. **Phase 9**: Volume integration
10. **Phase 10**: Channel collapse
11. **Phase 11**: Initialization
12. **Phase 12**: Admin tool (can be done in parallel after Phase 3)

---

## Testing Checklist

- [ ] Radio Roulette still works after rename
- [ ] Curated stations load from JSON
- [ ] Station selection modal shows favorites at top
- [ ] Type-to-filter works
- [ ] Manual station selection shows error on failure
- [ ] Random play auto-skips on failure
- [ ] Offline stations marked in list
- [ ] Blacklist expires correctly
- [ ] Favorites add/remove works
- [ ] Station info modal shows correct data
- [ ] Volume controls work
- [ ] Volume persists across reloads
- [ ] Channel collapse works
- [ ] Admin tool fetches stations
- [ ] Admin tool pre-checks existing stations
- [ ] Admin tool downloads valid JSON
