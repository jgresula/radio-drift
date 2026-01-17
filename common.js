// ============== Radio Drift Common Library ==============
// Shared utilities for Radio Roulette and Ambient Soundscape pages

// ============== Constants ==============
const BASE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const MAX_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day
const MAX_RETRY_ATTEMPTS = 10;

// ============== SVG Icons ==============
const speakerOnSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
const speakerOffSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
const heartOutlineSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const heartFilledSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
const shuffleSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>';

// ============== Utility Functions ==============
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============== Blacklist Functions ==============
function getBlacklist(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '{}');
    } catch { return {}; }
}

function saveBlacklist(key, blacklist) {
    localStorage.setItem(key, JSON.stringify(blacklist));
}

function isStationBlacklisted(key, stationId) {
    const blacklist = getBlacklist(key);
    const entry = blacklist[stationId];
    if (!entry) return false;
    if (Date.now() >= entry.until) {
        delete blacklist[stationId];
        saveBlacklist(key, blacklist);
        return false;
    }
    return true;
}

function blacklistStation(key, stationId, onUpdate) {
    const blacklist = getBlacklist(key);
    const entry = blacklist[stationId] || { fails: 0 };
    entry.fails++;
    const ttl = Math.min(BASE_TTL * Math.pow(2, entry.fails - 1), MAX_TTL);
    entry.until = Date.now() + ttl;
    blacklist[stationId] = entry;
    saveBlacklist(key, blacklist);
    console.log(`Station ${stationId} blacklisted for ${Math.round(ttl / 3600000)}h (fail #${entry.fails})`);
    if (onUpdate) onUpdate();
}

function unblacklistStation(key, stationId, onUpdate) {
    const blacklist = getBlacklist(key);
    if (blacklist[stationId]) {
        delete blacklist[stationId];
        saveBlacklist(key, blacklist);
        console.log(`Station ${stationId} removed from blacklist (now playing)`);
        if (onUpdate) onUpdate();
    }
}

// ============== Favorites Functions ==============
function getFavorites(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
}

function saveFavorites(key, favorites) {
    localStorage.setItem(key, JSON.stringify(favorites));
}

function isStationFavorite(key, stationId) {
    return getFavorites(key).some(f => f.stationuuid === stationId);
}

function exportFavoritesFile(key, filename) {
    const favorites = getFavorites(key);
    const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function importFavoritesFile(key, onSuccess) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const imported = JSON.parse(text);
            if (Array.isArray(imported)) {
                const existing = getFavorites(key);
                const merged = [...existing];
                imported.forEach(imp => {
                    if (!merged.some(m => m.stationuuid === imp.stationuuid)) {
                        merged.push(imp);
                    }
                });
                saveFavorites(key, merged);
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            console.error('Import failed:', err);
        }
    };
    input.click();
}

// ============== Radio Browser Server Selection ==============
const RADIO_BROWSER_LAST_SERVER_KEY = 'radioBrowserLastServer';
const RADIO_BROWSER_SERVERS_KEY = 'radioBrowserServers';
const RADIO_BROWSER_SERVERS_TTL = 24 * 60 * 60 * 1000; // 24 hours

const RADIO_BROWSER_FALLBACK_SERVERS = [
    'https://fi1.api.radio-browser.info',
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info'
];

function getLastWorkingServer() {
    return localStorage.getItem(RADIO_BROWSER_LAST_SERVER_KEY);
}

function saveLastWorkingServer(server) {
    localStorage.setItem(RADIO_BROWSER_LAST_SERVER_KEY, server);
}

function getCachedServers() {
    try {
        const data = JSON.parse(localStorage.getItem(RADIO_BROWSER_SERVERS_KEY));
        if (!data || !data.servers || !data.timestamp) return null;
        if (Date.now() - data.timestamp > RADIO_BROWSER_SERVERS_TTL) return null;
        return data.servers;
    } catch { return null; }
}

function cacheServers(servers) {
    localStorage.setItem(RADIO_BROWSER_SERVERS_KEY, JSON.stringify({
        servers,
        timestamp: Date.now()
    }));
}

async function fetchServerList() {
    const response = await fetch('https://all.api.radio-browser.info/json/servers');
    if (!response.ok) throw new Error('Failed to fetch server list');
    const servers = await response.json();
    if (!servers || servers.length === 0) throw new Error('No servers in list');
    return servers.map(s => `https://${s.name}`);
}

async function getServersToTry() {
    const servers = [];
    const seen = new Set();

    const addServer = (server) => {
        if (server && !seen.has(server)) {
            seen.add(server);
            servers.push(server);
        }
    };

    const addServers = (list, shuffle = false) => {
        if (!list) return;
        const toAdd = shuffle ? [...list].sort(() => Math.random() - 0.5) : list;
        toAdd.forEach(addServer);
    };

    // 1. Last working server first
    addServer(getLastWorkingServer());

    // 2. Other cached servers (shuffled)
    addServers(getCachedServers(), true);

    // 3. Try to fetch fresh list if we don't have enough servers
    if (servers.length < 3) {
        try {
            const fresh = await fetchServerList();
            cacheServers(fresh);
            addServers(fresh, true);
        } catch (err) {
            console.warn('Failed to fetch Radio Browser server list:', err.message);
        }
    }

    // 4. Hardcoded fallbacks
    addServers(RADIO_BROWSER_FALLBACK_SERVERS, true);

    return servers;
}

async function radioBrowserFetch(path) {
    const servers = await getServersToTry();
    let lastError;

    for (const server of servers) {
        try {
            const response = await fetch(`${server}${path}`);
            if (response.ok) {
                saveLastWorkingServer(server);
                return response;
            }
            lastError = new Error(`Server ${server} returned ${response.status}`);
            console.warn(`Radio Browser server ${server} failed with ${response.status}, trying next...`);
        } catch (err) {
            lastError = err;
            console.warn(`Radio Browser server ${server} error:`, err.message, '- trying next...');
        }
    }

    throw lastError || new Error('All Radio Browser servers failed');
}

// ============== Collapsible Channels ==============
function getCollapsedState(key, defaults) {
    try {
        return JSON.parse(localStorage.getItem(key)) || defaults;
    } catch { return defaults; }
}

function saveCollapsedState(key, state) {
    localStorage.setItem(key, JSON.stringify(state));
}

function toggleChannelCollapsed(key, defaults, channelName, applyFn) {
    const state = getCollapsedState(key, defaults);
    state[channelName] = !state[channelName];
    saveCollapsedState(key, state);
    if (applyFn) applyFn();
}

function setupCollapsibleChannels(key, defaults, applyFn) {
    document.querySelectorAll('.channel-header').forEach(header => {
        header.addEventListener('click', (e) => {
            if (e.target.classList.contains('channel-status')) return;
            const channelName = header.dataset.channel;
            if (channelName) toggleChannelCollapsed(key, defaults, channelName, applyFn);
        });
    });
}
