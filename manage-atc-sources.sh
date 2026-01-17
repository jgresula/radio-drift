#!/bin/bash
#
# manage-atc-sources.sh - Add ATC streams to atc-sources.json using Claude
#
# Usage: ./manage-atc-sources.sh <input-file>
#
# Input file format (one stream per line):
#   https://www.youtube.com/watch?v=VIDEO_ID Video Title Here
#   https://youtu.be/VIDEO_ID Video Title Here
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ATC_SOURCES="$SCRIPT_DIR/atc-sources.json"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 <input-file>"
    echo ""
    echo "Input file format (one stream per line):"
    echo "  https://www.youtube.com/watch?v=VIDEO_ID Video Title Here"
    echo "  https://youtu.be/VIDEO_ID Video Title Here"
    exit 1
}

# Check arguments
if [ $# -lt 1 ]; then
    usage
fi

INPUT_FILE="$1"

if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file '$INPUT_FILE' not found${NC}"
    exit 1
fi

if [ ! -f "$ATC_SOURCES" ]; then
    echo -e "${RED}Error: atc-sources.json not found at $ATC_SOURCES${NC}"
    exit 1
fi

# Check if claude is available
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: 'claude' command not found. Please install Claude CLI.${NC}"
    exit 1
fi

# Check if python3 is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: 'python3' command not found. Please install Python 3.${NC}"
    exit 1
fi

# Extract video ID from YouTube URL
extract_video_id() {
    local url="$1"
    local id=""

    # Handle youtube.com/watch?v=ID format
    if [[ "$url" =~ youtube\.com/watch\?v=([a-zA-Z0-9_-]+) ]]; then
        id="${BASH_REMATCH[1]}"
    # Handle youtu.be/ID format
    elif [[ "$url" =~ youtu\.be/([a-zA-Z0-9_-]+) ]]; then
        id="${BASH_REMATCH[1]}"
    # Handle youtube.com/live/ID format
    elif [[ "$url" =~ youtube\.com/live/([a-zA-Z0-9_-]+) ]]; then
        id="${BASH_REMATCH[1]}"
    fi

    echo "$id"
}

# Get existing IDs from atc-sources.json
get_existing_ids() {
    grep -o '"id": *"[^"]*"' "$ATC_SOURCES" | sed 's/"id": *"\([^"]*\)"/\1/'
}

# Check if ID already exists
id_exists() {
    local id="$1"
    local existing_ids="$2"
    echo "$existing_ids" | grep -q "^${id}$"
}

# Parse input file and collect new streams
echo "Parsing input file..."
EXISTING_IDS=$(get_existing_ids)
NEW_STREAMS=""
SKIPPED=0

while IFS= read -r line || [ -n "$line" ]; do
    # Skip empty lines and comments
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

    # Extract URL (first word) and name (rest of the line)
    url=$(echo "$line" | awk '{print $1}')
    name=$(echo "$line" | cut -d' ' -f2-)

    video_id=$(extract_video_id "$url")

    if [ -z "$video_id" ]; then
        echo -e "${YELLOW}Warning: Could not extract video ID from: $url${NC}"
        continue
    fi

    if id_exists "$video_id" "$EXISTING_IDS"; then
        echo -e "${YELLOW}Warning: Stream already exists (ID: $video_id) - skipping${NC}"
        ((SKIPPED++))
        continue
    fi

    # Add to new streams list
    if [ -n "$NEW_STREAMS" ]; then
        NEW_STREAMS="$NEW_STREAMS"$'\n'
    fi
    NEW_STREAMS="${NEW_STREAMS}${video_id} ${name}"

done < "$INPUT_FILE"

if [ -z "$NEW_STREAMS" ]; then
    echo ""
    if [ $SKIPPED -gt 0 ]; then
        echo "No new streams to add ($SKIPPED already exist)."
    else
        echo "No valid streams found in input file."
    fi
    echo ""
    echo "Checking for missing timezones in existing entries..."
fi

# Build the prompt for Claude
PROMPT="You are updating atc-sources.json for an ATC live stream application.

CURRENT atc-sources.json:
\`\`\`json
$(cat "$ATC_SOURCES")
\`\`\`

TASKS:
1. Add timezones to ALL entries that don't have a \"timezone\" field. Use IANA timezone names (e.g., \"America/New_York\", \"Europe/Prague\", \"Asia/Hong_Kong\"). Determine the timezone based on the airport IATA code in the name.

2. Add the following NEW streams (if any). Reformat names to match the existing convention: \"IATA - City/Airport Description\". Add timezone for each.

NEW STREAMS TO ADD:
$NEW_STREAMS

NAMING CONVENTION EXAMPLES:
- \"ATL - Atlanta Flightradar24 with ATC\"
- \"JFK - New York Kennedy ATC\"
- \"LAX - Los Angeles Runways 24L & 24R\"
- \"PRG - Prague Vaclav Havel 24/7\"

OUTPUT:
Return ONLY the complete updated JSON array, sorted alphabetically by the \"name\" field. No explanation, no markdown code blocks, just valid JSON."

echo ""
echo "Calling Claude to update atc-sources.json..."
echo ""

# Call Claude and capture output
RESULT=$(echo "$PROMPT" | claude --print)

# Validate JSON
if ! printf '%s\n' "$RESULT" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
    echo -e "${RED}Error: Claude returned invalid JSON${NC}"
    echo "Raw output:"
    printf '%s\n' "$RESULT"
    exit 1
fi

# Backup current file
cp "$ATC_SOURCES" "${ATC_SOURCES}.bak"

# Write to temp file, pretty print, then move atomically
printf '%s\n' "$RESULT" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=4))" > "${ATC_SOURCES}.tmp"
mv "${ATC_SOURCES}.tmp" "$ATC_SOURCES"

echo -e "${GREEN}Successfully updated atc-sources.json${NC}"
echo "Backup saved to ${ATC_SOURCES}.bak"
echo ""
echo "Summary of changes:"
diff --color=auto "${ATC_SOURCES}.bak" "$ATC_SOURCES" || true
