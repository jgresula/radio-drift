# Ambient Radio - Design Document

## Overview

Add a curated list of ambient radio stations as a new source alongside the existing "Radio Roulette" (renamed from "Ambient Radio").

### Goals
- Rename existing "Ambient Radio" to "Radio Roulette"
- Add new "Ambient Radio" source with curated stations from a JSON file
- Share as much code as possible between both sources
- Provide admin tooling for curating the station list

---

## Feature Changes

### Rename: Ambient Radio → Radio Roulette

The current dynamic radio feature (fetches from Radio Browser API by tag) will be renamed to "Radio Roulette" to reflect its randomized discovery nature.

**Changes:**
- UI label: "Ambient Radio" → "Radio Roulette"
- Internal references can remain as-is (no localStorage key migration needed)

### New Source: Ambient Radio (Curated)

A new channel with a hand-picked list of ambient stations loaded from a local JSON file.

---

## Data Structures

### Curated Stations JSON (`ambient-stations.json`)

```json
[
  {
    "stationuuid": "unique-id-from-radio-browser",
    "name": "Station Name",
    "url_resolved": "https://stream.url/audio",
    "tags": "ambient,drone,relaxing",
    "homepage": "https://station.homepage.com",
    "favicon": "https://station.favicon.url/icon.png",
    "country": "Germany",
    "countrycode": "DE",
    "codec": "MP3",
    "bitrate": 128
  }
]
```

**Field source:** All fields from Radio Browser API (`/json/stations/byuuid`)

**Matching key:** `stationuuid` - permanent unique identifier

### Favorites Storage

Separate from Radio Roulette favorites.

```javascript
// localStorage key
'ambientCuratedFavorites'

// Structure (same as Radio Roulette)
[
  {
    stationuuid: "...",
    name: "...",
    url_resolved: "...",
    tags: "..."
  }
]
```

### Offline/Failed Stations Storage

Reuses the same backoff logic as Radio Roulette (6h → 12h → 24h → 7d max).

```javascript
// localStorage key
'ambientCuratedBlacklist'

// Structure
{
  "stationuuid": {
    "fails": 2,
    "until": 1234567890000  // timestamp
  }
}
```

---

## UI Design

### Channel Layout

New channel follows existing pattern:

```
<channel id="ambient-channel">
  <channel-header>
    Ambient Radio [status badge]
  </channel-header>
  <channel-content>
    <station-btn> → opens station selection modal
    <now-playing>
      Station Name  [♥ favorite] [ⓘ info]
    </now-playing>
    <controls>
      [play/pause] [mute] [volume slider]
    </controls>
    <button-row>
      [shuffle] [favorites]
    </button-row>
  </channel-content>
</channel>
```

### Station Selection Modal

```
┌─────────────────────────────────────┐
│ Select Station                   ✕  │
├─────────────────────────────────────┤
│ [Search stations...            ]    │
├─────────────────────────────────────┤
│ ★ Favorites                         │
│ ┌─────────────────────────────────┐ │
│ │ Favorite Station 1              │ │
│ │ Favorite Station 2              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ All Stations                        │
│ ┌─────────────────────────────────┐ │
│ │ Station A                       │ │
│ │ Station B              [offline]│ │
│ │ Station C                       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Features:**
- Type-to-filter (autocomplete as you type)
- Favorites section pinned at top
- Offline/failed stations marked and visually distinct
- Click station to play

### Station Info Modal

Same as Radio Roulette:

```
┌─────────────────────────────────────┐
│ Station Info                     ✕  │
├─────────────────────────────────────┤
│ [favicon]  Station Name             │
│                                     │
│ Tags:     ambient, drone, relaxing  │
│ Country:  Germany (DE)              │
│ Codec:    MP3                       │
│ Bitrate:  128 kbps                  │
│                                     │
│ [Visit Homepage]                    │
└─────────────────────────────────────┘
```

### Now Playing Display

```
Now Playing: Station Name  [♥][ⓘ]
```

- Same layout as Radio Roulette
- `[♥]` - toggle favorite
- `[ⓘ]` - open station info modal

---

## Behavior Specifications

### Station Playback

**Random play (shuffle button):**
1. Select random station from curated list (excluding offline stations)
2. If stream fails → auto-skip to next station (silent)
3. Mark failed station as "offline" with backoff timer
4. Continue until working station found or all exhausted

**Manual selection (pick from list):**
1. User selects station from modal
2. If stream fails → show error message to user
3. Mark station as "offline" with backoff timer
4. User must manually select another station

### Offline Station Handling

**Backoff schedule (same as Radio Roulette):**
- 1st failure: 6 hours
- 2nd failure: 12 hours
- 3rd failure: 24 hours
- 4th+ failure: 7 days (max)

**Offline stations:**
- Marked visually in station list (e.g., grayed out, "[offline]" label)
- Excluded from random/shuffle play
- Can still be manually selected (will show error if still down)
- Timer resets when backoff period expires

### Favorites

- Stored separately from Radio Roulette favorites
- Toggle via `[♥]` button on now-playing display
- Favorites appear at top of station selection modal
- Favorites persist in localStorage

### Volume

- Integrated with existing volume system
- New key in volume settings: `ambient` (for curated channel)
- Master volume applies
- Per-channel volume slider

---

## Code Architecture

### Shared Code (with Radio Roulette)

Extract/reuse these patterns:

| Function | Purpose |
|----------|---------|
| `playAudioStream(station, audioEl)` | Create audio element, handle playback |
| `handleStreamError(station, onRetry)` | Error handling with blacklist |
| `getBlacklist(key)` / `updateBlacklist(key, station)` | Blacklist management |
| `isStationBlacklisted(key, stationId)` | Check blacklist status |
| `renderStationInfo(station)` | Info modal content |
| `toggleFavorite(key, station)` | Favorite toggle logic |
| `getFavorites(key)` / `saveFavorites(key, list)` | Favorites persistence |

### New Code (Ambient Radio specific)

| Function | Purpose |
|----------|---------|
| `loadCuratedStations()` | Fetch `ambient-stations.json` |
| `renderCuratedStationList()` | Modal list with search/filter |
| `filterStations(query)` | Type-to-filter implementation |
| `playCuratedStation(station)` | Play with manual-selection error handling |
| `shuffleCuratedStations()` | Random play with auto-skip |

### Storage Keys

| Key | Purpose |
|-----|---------|
| `ambientCuratedFavorites` | Favorite stations list |
| `ambientCuratedBlacklist` | Failed stations with TTL |
| `ambientCuratedSelected` | Last selected station |
| `ambientVolumeSettings.ambient` | Channel volume level |

---

## Admin Tool

### Purpose

Python script to curate the ambient station list from Radio Browser API.

### Workflow

1. Run Python script
2. Script fetches ambient stations from Radio Browser API
3. Generates HTML page with interactive table
4. Open HTML in browser
5. Check/uncheck stations to include
6. Download updated `ambient-stations.json`

### API Endpoints Used

```
GET https://de2.api.radio-browser.info/json/stations/bytag/ambient
    ?hidebroken=true
    &order=clickcount
    &limit=500
```

### HTML Table Columns

| Column | Description |
|--------|-------------|
| ☑ Checkbox | Toggle inclusion in curated list |
| Station Name | Station name |
| ▶ Play | Preview button (plays stream) |
| Tags | Station tags |
| Listeners | Click count / popularity |
| Link | Link to station homepage |

### Features

- **Pre-check existing:** On page load, load current `ambient-stations.json` and check boxes for stations already in the list (match by `stationuuid`)
- **Search/filter:** Filter table by name or tags
- **Sort:** Click column headers to sort
- **Download:** Button to download the checked stations as JSON

### Script Output

```
admin/
  curate-stations.py    # Python script
  curate-stations.html  # Generated HTML page
  ambient-stations.json # Output (copy to root)
```

### Python Script Pseudocode

```python
# curate-stations.py

import requests
import json

API_URL = "https://de2.api.radio-browser.info/json/stations/bytag/ambient"
PARAMS = {
    "hidebroken": "true",
    "order": "clickcount",
    "limit": 500
}

def fetch_stations():
    response = requests.get(API_URL, params=PARAMS)
    return response.json()

def generate_html(stations):
    # Generate HTML with:
    # - Table of stations
    # - JavaScript to handle checkboxes
    # - Load existing JSON and pre-check
    # - Download button
    pass

if __name__ == "__main__":
    stations = fetch_stations()
    html = generate_html(stations)
    with open("curate-stations.html", "w") as f:
        f.write(html)
```

---

## Implementation Phases

### Phase 1: Rename + Data Structure
- Rename "Ambient Radio" → "Radio Roulette" in UI
- Create `ambient-stations.json` structure
- Create empty curated station list

### Phase 2: Admin Tool
- Python script to fetch stations
- HTML curation interface
- Initial station curation

### Phase 3: Ambient Radio Channel
- New channel HTML structure
- Station selection modal with search
- Favorites at top of list

### Phase 4: Playback + Error Handling
- Audio playback integration
- Error handling (manual vs random)
- Blacklist/offline logic

### Phase 5: Shared Code Refactor
- Extract common audio playback logic
- Extract common favorites logic
- Extract common blacklist logic

### Phase 6: Polish
- Volume integration
- Persistence (last selected, collapsed state)
- UI polish and testing

---

## Open Questions

None - all design decisions resolved.

---

## Appendix: Radio Browser API Reference

**Station fields:**
- `stationuuid` - permanent unique identifier
- `name` - station name
- `url_resolved` - actual stream URL
- `tags` - comma-separated tags
- `homepage` - station website
- `favicon` - icon URL
- `country` / `countrycode` - location
- `codec` - audio codec (MP3, AAC, etc.)
- `bitrate` - stream bitrate
- `votes` - user votes
- `clickcount` - popularity metric
- `lastcheckok` - 1 if online at last check

**Useful endpoints:**
- `/json/stations/bytag/{tag}` - stations by tag
- `/json/stations/byuuid/{uuid}` - station by UUID
- Parameters: `hidebroken`, `order`, `limit`, `offset`
