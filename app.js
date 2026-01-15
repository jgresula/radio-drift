        // ============== Constants ==============
        const BLACKLIST_KEY = 'ambientRadioBlacklist';
        const FAVORITES_KEY = 'ambientRadioFavorites';
        const TAGS_CACHE_KEY = 'ambientRadioTags';
        const SELECTED_TAG_KEY = 'ambientRadioSelectedTag';
        const SELECTED_SOURCE_KEY = 'ambientSpaceSource';
        const SELECTED_ATC_SOURCE_KEY = 'ambientAtcSource';
        const CHANNEL_COLLAPSED_KEY = 'ambientChannelCollapsed';
        const VOLUME_SETTINGS_KEY = 'ambientVolumeSettings';
        const BASE_TTL = 6 * 60 * 60 * 1000; // 6 hours
        const MAX_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
        const TAGS_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day
        const MAX_RETRY_ATTEMPTS = 10;

        // Curated Ambient Radio constants
        const CURATED_STATIONS_FILE = 'ambient-stations.json';
        const CURATED_BLACKLIST_KEY = 'ambientCuratedBlacklist';
        const CURATED_FAVORITES_KEY = 'ambientCuratedFavorites';
        const CURATED_SELECTED_KEY = 'ambientCuratedSelected';

        // ============== State ==============
        let spaceAudioClips = [];
        let radioAudio = null;
        let spaceAudio = null;
        let currentStation = null;
        let currentSpaceClip = 0;
        let stations = [];
        let shuffledPlaylist = [];
        let playlistIndex = 0;
        let allTags = [];
        let allSources = [];
        let allAtcSources = [];
        let currentTag = localStorage.getItem(SELECTED_TAG_KEY) || 'ambient';
        let currentSource = localStorage.getItem(SELECTED_SOURCE_KEY) || 'apollo11.json';
        let currentAtcSource = localStorage.getItem(SELECTED_ATC_SOURCE_KEY) || null;
        let radioStopping = false;
        let spaceStopping = false;
        let masterMuted = false;
        let radioMuted = false;
        let spaceMuted = false;
        let atcMuted = false;
        let masterVolume = 1;
        let retryCount = 0;
        let atcPlayer = null;
        let atcPlayerReady = false;
        let radioBufferingTimeout = null;

        // Curated Ambient Radio state
        let curatedStations = [];
        let curatedAudio = null;
        let currentCuratedStation = null;
        let curatedStopping = false;
        let curatedMuted = false;
        let curatedShuffledPlaylist = [];
        let curatedPlaylistIndex = 0;
        let curatedBufferingTimeout = null;

        // ============== DOM Elements ==============
        const radioToggleBtn = document.getElementById('radio-toggle');
        const radioShuffleBtn = document.getElementById('radio-shuffle');
        const radioVolumeSlider = document.getElementById('radio-volume');
        const radioVolumeValue = document.getElementById('radio-volume-value');
        const radioStatus = document.getElementById('radio-status');
        const radioNowPlaying = document.getElementById('radio-now-playing');
        const radioMeta = document.getElementById('radio-meta');
        const radioFavoriteBtn = document.getElementById('radio-favorite');
        const radioInfoBtn = document.getElementById('radio-info');
        const tagBtn = document.getElementById('tag-btn');
        const currentTagSpan = document.getElementById('current-tag');

        const spaceToggleBtn = document.getElementById('space-toggle');
        const spaceShuffleBtn = document.getElementById('space-shuffle');
        const spaceVolumeSlider = document.getElementById('space-volume');
        const spaceVolumeValue = document.getElementById('space-volume-value');
        const spaceStatus = document.getElementById('space-status');
        const spaceNowPlaying = document.getElementById('space-now-playing');
        const spaceProgress = document.getElementById('space-progress');
        const spaceProgressBar = document.querySelector('#space-progress .progress-bar');
        const spaceProgressFill = document.getElementById('space-progress-fill');
        const spaceCurrent = document.getElementById('space-current');
        const spaceDuration = document.getElementById('space-duration');

        const atcToggleBtn = document.getElementById('atc-toggle');
        const atcVolumeSlider = document.getElementById('atc-volume');
        const atcVolumeValue = document.getElementById('atc-volume-value');
        const atcStatus = document.getElementById('atc-status');
        const atcMuteBtn = document.getElementById('atc-mute');
        const atcSourceBtn = document.getElementById('atc-source-btn');
        const currentAtcSourceSpan = document.getElementById('current-atc-source');
        const atcSourceModal = document.getElementById('atc-source-modal');
        const atcSourceModalClose = document.getElementById('atc-source-modal-close');
        const atcSourceList = document.getElementById('atc-source-list');
        const youtubeContainer = document.getElementById('youtube-container');
        const atcDisabledMessage = document.getElementById('atc-disabled-message');
        const atcControls = document.getElementById('atc-controls');
        const atcFullscreenBtn = document.getElementById('atc-fullscreen');
        const atcTheaterBtn = document.getElementById('atc-theater');

        const masterVolumeSlider = document.getElementById('master-volume');
        const masterVolumeValue = document.getElementById('master-volume-value');
        const masterMuteBtn = document.getElementById('master-mute');
        const radioMuteBtn = document.getElementById('radio-mute');
        const spaceMuteBtn = document.getElementById('space-mute');

        const tagModal = document.getElementById('tag-modal');
        const tagModalClose = document.getElementById('tag-modal-close');
        const tagSearch = document.getElementById('tag-search');
        const tagList = document.getElementById('tag-list');

        const favoritesModal = document.getElementById('favorites-modal');
        const favoritesModalClose = document.getElementById('favorites-modal-close');
        const favoritesList = document.getElementById('favorites-list');
        const openFavoritesBtn = document.getElementById('open-favorites');
        const importFavoritesBtn = document.getElementById('import-favorites');
        const exportFavoritesBtn = document.getElementById('export-favorites');

        const sourceBtn = document.getElementById('source-btn');
        const currentSourceSpan = document.getElementById('current-source');
        const sourceModal = document.getElementById('source-modal');
        const sourceModalClose = document.getElementById('source-modal-close');
        const sourceList = document.getElementById('source-list');

        const stationInfoModal = document.getElementById('station-info-modal');
        const stationInfoClose = document.getElementById('station-info-close');
        const stationInfoContent = document.getElementById('station-info-content');

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

        // ============== SVG Icons ==============
        const speakerOnSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>';
        const speakerOffSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
        const infoSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
        const heartOutlineSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
        const heartFilledSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
        const shuffleSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>';

        // ============== Utility Functions ==============
        function formatDuration(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        function shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }

        function createShuffledPlaylist() {
            const indexes = stations.map((_, i) => i);
            shuffledPlaylist = shuffleArray(indexes);
            playlistIndex = 0;
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

        function getAvailableStations() {
            return stations.filter(s => !isStationBlacklisted(BLACKLIST_KEY, s.stationuuid));
        }

        function getAvailableStationCount() {
            return getAvailableStations().length;
        }

        function updateTagDisplay() {
            const count = getAvailableStationCount();
            currentTagSpan.textContent = count > 0 ? `${currentTag} · ${count}` : currentTag;
        }

        function updateSourceDisplay() {
            const source = allSources.find(s => s.json === currentSource);
            const name = source ? source.name : 'Unknown';
            const count = spaceAudioClips.length;
            currentSourceSpan.textContent = count > 0 ? `${name} · ${count} clips` : name;
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

        function toggleFavorite() {
            if (!currentStation) return;
            const favorites = getFavorites(FAVORITES_KEY);
            const index = favorites.findIndex(f => f.stationuuid === currentStation.stationuuid);
            if (index >= 0) {
                favorites.splice(index, 1);
                radioFavoriteBtn.innerHTML = heartOutlineSvg;
                radioFavoriteBtn.classList.remove('active');
            } else {
                favorites.push({
                    stationuuid: currentStation.stationuuid,
                    name: currentStation.name,
                    url_resolved: currentStation.url_resolved,
                    tags: currentStation.tags
                });
                radioFavoriteBtn.innerHTML = heartFilledSvg;
                radioFavoriteBtn.classList.add('active');
            }
            saveFavorites(FAVORITES_KEY, favorites);
        }

        function updateFavoriteButton() {
            if (currentStation && isStationFavorite(FAVORITES_KEY, currentStation.stationuuid)) {
                radioFavoriteBtn.innerHTML = heartFilledSvg;
                radioFavoriteBtn.classList.add('active');
            } else {
                radioFavoriteBtn.innerHTML = heartOutlineSvg;
                radioFavoriteBtn.classList.remove('active');
            }
        }

        function renderFavorites() {
            const favorites = getFavorites(FAVORITES_KEY);
            if (favorites.length === 0) {
                favoritesList.innerHTML = '<div class="empty-message">No favorites yet</div>';
                return;
            }
            favoritesList.innerHTML = favorites.map((fav, i) => `
                <div class="favorite-item">
                    <div class="favorite-info">
                        <div class="favorite-name">${fav.name}</div>
                        <div class="favorite-tag">${fav.tags || ''}</div>
                    </div>
                    <div class="favorite-actions">
                        <button onclick="playFavorite(${i})" title="Play">&#9654;</button>
                        <button onclick="removeFavorite(${i})" title="Remove">&#10005;</button>
                    </div>
                </div>
            `).join('');
        }

        function playFavorite(index) {
            const favorites = getFavorites(FAVORITES_KEY);
            const fav = favorites[index];
            if (!fav) return;
            currentStation = fav;
            playStation(fav);
            closeFavoritesModal();
        }

        function removeFavorite(index) {
            const favorites = getFavorites(FAVORITES_KEY);
            favorites.splice(index, 1);
            saveFavorites(FAVORITES_KEY, favorites);
            renderFavorites();
            updateFavoriteButton();
        }

        function exportFavorites() {
            const favorites = getFavorites(FAVORITES_KEY);
            const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ambient-radio-favorites.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importFavorites() {
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
                        const existing = getFavorites(FAVORITES_KEY);
                        const merged = [...existing];
                        imported.forEach(imp => {
                            if (!merged.some(m => m.stationuuid === imp.stationuuid)) {
                                merged.push(imp);
                            }
                        });
                        saveFavorites(FAVORITES_KEY, merged);
                        renderFavorites();
                        updateFavoriteButton();
                    }
                } catch (err) {
                    console.error('Import failed:', err);
                }
            };
            input.click();
        }

        // ============== Tags Functions ==============
        function getCachedTags() {
            try {
                const cached = JSON.parse(localStorage.getItem(TAGS_CACHE_KEY));
                if (cached && Date.now() < cached.expires) {
                    return cached.tags;
                }
            } catch {}
            return null;
        }

        function cacheTags(tags) {
            localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify({
                tags,
                expires: Date.now() + TAGS_CACHE_TTL
            }));
        }

        async function fetchTags() {
            const cached = getCachedTags();
            if (cached) {
                allTags = cached;
                return;
            }
            try {
                const response = await radioBrowserFetch('/json/tags?limit=2000&order=stationcount&reverse=true');
                allTags = await response.json();
                allTags = allTags.filter(t => t.stationcount > 5);
                cacheTags(allTags);
            } catch (err) {
                console.error('Error fetching tags:', err);
            }
        }

        function renderTags(filter = '') {
            const filtered = allTags.filter(t =>
                t.name.toLowerCase().includes(filter.toLowerCase())
            );
            tagList.innerHTML = filtered.slice(0, 100).map(tag => `
                <div class="tag-item ${tag.name === currentTag ? 'selected' : ''}" data-tag="${tag.name}">
                    <span class="tag-name">${tag.name}</span>
                    <span class="tag-count">${tag.stationcount}</span>
                </div>
            `).join('');
        }

        async function selectTag(tagName) {
            const wasPlaying = radioAudio && !radioAudio.paused;

            currentTag = tagName;
            localStorage.setItem(SELECTED_TAG_KEY, tagName);
            currentTagSpan.textContent = tagName;
            closeTagModal();
            await fetchStationsByTag(tagName);

            // Auto-play if was playing before
            if (wasPlaying) {
                playRandomStation();
            }
        }

        // ============== Volume Functions ==============
        function updateVolumes() {
            const effectiveMaster = masterMuted ? 0 : masterVolume;
            if (radioAudio) {
                const radioVol = radioMuted ? 0 : (radioVolumeSlider.value / 100);
                radioAudio.volume = radioVol * effectiveMaster;
            }
            if (spaceAudio) {
                const spaceVol = spaceMuted ? 0 : (spaceVolumeSlider.value / 100);
                spaceAudio.volume = spaceVol * effectiveMaster;
            }
            if (atcPlayer && atcPlayerReady) {
                const atcVol = atcMuted ? 0 : (atcVolumeSlider.value / 100);
                // YouTube volume is 0-100
                atcPlayer.setVolume(atcVol * effectiveMaster * 100);
            }
            if (curatedAudio) {
                const curatedVol = curatedMuted ? 0 : (curatedVolumeSlider.value / 100);
                curatedAudio.volume = curatedVol * effectiveMaster;
            }
        }

        function getVolumeSettings() {
            try {
                return JSON.parse(localStorage.getItem(VOLUME_SETTINGS_KEY)) || { master: 100, radio: 50, atc: 50, space: 50, curated: 50 };
            } catch { return { master: 100, radio: 50, atc: 50, space: 50, curated: 50 }; }
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
            masterVolumeSlider.value = settings.master;
            masterVolumeValue.textContent = `${settings.master}%`;
            masterVolume = settings.master / 100;
            radioVolumeSlider.value = settings.radio;
            radioVolumeValue.textContent = `${settings.radio}%`;
            atcVolumeSlider.value = settings.atc;
            atcVolumeValue.textContent = `${settings.atc}%`;
            spaceVolumeSlider.value = settings.space;
            spaceVolumeValue.textContent = `${settings.space}%`;
            const curatedVol = settings.curated ?? 50;
            curatedVolumeSlider.value = curatedVol;
            curatedVolumeValue.textContent = `${curatedVol}%`;
        }

        // ============== Radio Browser Server Selection ==============
        //
        // Strategy for finding a working Radio Browser API server:
        //
        // 1. Try LAST WORKING SERVER first (from localStorage)
        //    - Fastest path for returning users
        //    - Most likely to still work
        //
        // 2. Try OTHER CACHED SERVERS (from localStorage, shuffled)
        //    - Server list cached with 24h TTL
        //    - Shuffled to distribute load across servers
        //
        // 3. FETCH FRESH SERVER LIST (if cache expired/empty)
        //    - From https://all.api.radio-browser.info/json/servers
        //    - Updates the cache on success
        //
        // 4. HARDCODED FALLBACK SERVERS (last resort)
        //    - Used when server list endpoint is down
        //    - Guarantees we always have servers to try
        //
        // On successful request: save server as "last working" for next time
        //
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

        async function fetchStationsByTag(tag) {
            const wasPlaying = radioAudio && !radioAudio.paused;
            const previousStatus = radioStatus.textContent;
            const previousNowPlaying = radioNowPlaying.textContent;

            if (!wasPlaying) {
                radioStatus.textContent = 'Loading...';
                radioStatus.className = 'channel-status loading';
                radioNowPlaying.textContent = 'Fetching stations...';
            }

            try {
                const response = await radioBrowserFetch(`/json/stations/bytagexact/${encodeURIComponent(tag)}?order=random&hidebroken=true`);
                stations = await response.json();
                stations = stations.filter(s => s.url_resolved && s.url_resolved.length > 0);

                if (stations.length === 0) {
                    throw new Error('No stations found');
                }

                // Create shuffled playlist for sequential random play
                createShuffledPlaylist();

                // Update tag display with station count
                updateTagDisplay();

                if (wasPlaying) {
                    radioStatus.textContent = 'Playing';
                } else {
                    radioStatus.textContent = 'Ready';
                    radioStatus.className = 'channel-status';
                    radioNowPlaying.textContent = 'Click play to start';
                }
            } catch (error) {
                console.error('Error fetching stations:', error);
                if (!wasPlaying) {
                    radioStatus.textContent = 'Error';
                    radioStatus.className = 'channel-status error';
                    radioNowPlaying.textContent = 'Failed to load stations';
                }
            }
        }

        function playStation(station) {
            if (radioAudio) {
                radioAudio.pause();
                radioAudio.src = '';
            }

            currentStation = station;
            retryCount = 0;
            radioNowPlaying.textContent = station.name || 'Unknown Station';
            radioMeta.textContent = '';
            radioStatus.textContent = 'Connecting...';
            radioStatus.className = 'channel-status loading';
            updateFavoriteButton();

            const newAudio = new Audio();
            radioAudio = newAudio;
            radioStopping = false;
            newAudio.crossOrigin = 'anonymous';
            updateVolumes();

            newAudio.addEventListener('playing', () => {
                if (radioAudio !== newAudio) return;
                if (radioBufferingTimeout) {
                    clearTimeout(radioBufferingTimeout);
                    radioBufferingTimeout = null;
                }
                radioStatus.textContent = 'Playing';
                radioStatus.className = 'channel-status playing';
                radioToggleBtn.innerHTML = '&#10074;&#10074;';
                retryCount = 0;
            });

            newAudio.addEventListener('error', (e) => {
                if (radioAudio !== newAudio || radioStopping) return;
                if (radioBufferingTimeout) {
                    clearTimeout(radioBufferingTimeout);
                    radioBufferingTimeout = null;
                }
                console.error('Radio playback error:', e);
                blacklistStation(BLACKLIST_KEY, currentStation.stationuuid, updateTagDisplay);
                autoRetryNextStation();
            });

            newAudio.addEventListener('waiting', () => {
                if (radioAudio !== newAudio) return;
                radioStatus.textContent = 'Buffering...';
                radioStatus.className = 'channel-status loading';
                // Skip to next station if buffering takes too long (10s)
                if (radioBufferingTimeout) clearTimeout(radioBufferingTimeout);
                radioBufferingTimeout = setTimeout(() => {
                    if (radioAudio === newAudio && !radioStopping) {
                        console.log('Buffering timeout, skipping to next station');
                        playRandomStation();
                    }
                }, 10000);
            });

            // Best-effort metadata from MediaSession
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = null;
                newAudio.addEventListener('loadedmetadata', () => {
                    checkMediaSessionMetadata();
                });
            }

            newAudio.src = station.url_resolved;
            newAudio.play().catch(err => {
                if (radioAudio !== newAudio || radioStopping) return;
                console.error('Play failed:', err);
                blacklistStation(BLACKLIST_KEY, currentStation.stationuuid, updateTagDisplay);
                autoRetryNextStation();
            });
        }

        function autoRetryNextStation() {
            retryCount++;
            if (retryCount >= MAX_RETRY_ATTEMPTS) {
                radioStatus.textContent = 'No working stations';
                radioStatus.className = 'channel-status error';
                radioNowPlaying.textContent = 'Try another genre';
                return;
            }

            const available = getAvailableStations();
            if (available.length === 0) {
                radioStatus.textContent = 'No stations available';
                radioStatus.className = 'channel-status error';
                radioNowPlaying.textContent = 'All stations blacklisted';
                return;
            }

            radioStatus.textContent = 'Trying another...';
            radioStatus.className = 'channel-status loading';

            setTimeout(() => {
                playRandomStation();
            }, 500);
        }

        function playNextStation() {
            if (stations.length === 0) {
                radioNowPlaying.textContent = 'No stations available';
                return;
            }

            // Find next non-blacklisted station in shuffled playlist
            let attempts = 0;
            while (attempts < stations.length) {
                const stationIndex = shuffledPlaylist[playlistIndex];
                const station = stations[stationIndex];

                // Advance playlist index (loop back to start)
                playlistIndex = (playlistIndex + 1) % shuffledPlaylist.length;

                if (!isStationBlacklisted(BLACKLIST_KEY, station.stationuuid)) {
                    playStation(station);
                    return;
                }
                attempts++;
            }

            radioNowPlaying.textContent = 'All stations temporarily unavailable';
        }

        // Alias for backward compatibility
        function playRandomStation() {
            playNextStation();
        }

        function checkMediaSessionMetadata() {
            // Periodically check for metadata updates
            const checkMeta = () => {
                if (!radioAudio || radioAudio.paused) return;
                if ('mediaSession' in navigator && navigator.mediaSession.metadata) {
                    const meta = navigator.mediaSession.metadata;
                    if (meta.title || meta.artist) {
                        const parts = [];
                        if (meta.artist) parts.push(meta.artist);
                        if (meta.title) parts.push(meta.title);
                        radioMeta.textContent = parts.join(' - ');
                    }
                }
            };
            setInterval(checkMeta, 5000);
            checkMeta();
        }

        function stopRadio() {
            radioStopping = true;
            if (radioBufferingTimeout) {
                clearTimeout(radioBufferingTimeout);
                radioBufferingTimeout = null;
            }
            if (radioAudio) {
                radioAudio.pause();
            }
            radioStatus.textContent = 'Paused';
            radioStatus.className = 'channel-status';
            radioToggleBtn.innerHTML = '&#9654;';
        }

        function toggleRadio() {
            if (radioAudio && !radioAudio.paused) {
                stopRadio();
            } else if (radioAudio && radioAudio.src) {
                radioStopping = false;
                radioAudio.play().catch(() => playRandomStation());
            } else {
                playRandomStation();
            }
        }

        // ============== Space Audio Functions ==============
        async function loadSources() {
            try {
                const response = await fetch('sources.json');
                if (!response.ok) throw new Error('Failed to load sources');
                allSources = await response.json();

                // Find and display current source name
                const source = allSources.find(s => s.json === currentSource) || allSources[0];
                if (source) {
                    currentSource = source.json;
                    currentSourceSpan.textContent = source.name;
                }

                await loadSpaceClips();
            } catch (error) {
                console.error('Error loading sources:', error);
                // Fallback to loading default apollo11.json
                await loadSpaceClips();
            }
        }

        async function loadSpaceClips() {
            try {
                const response = await fetch(currentSource);
                if (!response.ok) throw new Error('Failed to load clips');
                const clips = await response.json();
                spaceAudioClips = clips.map(c => ({
                    name: c.name,
                    url: c.url
                }));
                updateSourceDisplay();
                spaceStatus.textContent = 'Ready';
                spaceNowPlaying.textContent = 'Click play to start';
                currentSpaceClip = 0;
            } catch (error) {
                console.error('Error loading space clips:', error);
                spaceStatus.textContent = 'Error';
                spaceStatus.className = 'channel-status error';
                spaceNowPlaying.textContent = 'Failed to load clips';
            }
        }

        function playSpaceAudio() {
            if (spaceAudioClips.length === 0) {
                spaceNowPlaying.textContent = 'No clips available';
                return;
            }

            spaceStopping = false;
            if (spaceAudio) {
                spaceAudio.pause();
            }

            const clip = spaceAudioClips[currentSpaceClip];
            spaceNowPlaying.textContent = clip.name;
            spaceStatus.textContent = 'Loading...';
            spaceStatus.className = 'channel-status loading';

            spaceProgress.style.display = 'flex';
            spaceProgressFill.style.width = '0%';
            spaceCurrent.textContent = '0:00:00';
            spaceDuration.textContent = '0:00:00';

            spaceAudio = new Audio();
            spaceAudio.crossOrigin = 'anonymous';
            updateVolumes();

            spaceAudio.addEventListener('playing', () => {
                spaceStatus.textContent = 'Playing';
                spaceStatus.className = 'channel-status playing';
                spaceToggleBtn.innerHTML = '&#10074;&#10074;';
            });

            spaceAudio.addEventListener('timeupdate', () => {
                if (spaceAudio.duration) {
                    const percent = (spaceAudio.currentTime / spaceAudio.duration) * 100;
                    spaceProgressFill.style.width = `${percent}%`;
                    spaceCurrent.textContent = formatDuration(spaceAudio.currentTime);
                    spaceDuration.textContent = formatDuration(spaceAudio.duration);
                }
            });

            spaceAudio.addEventListener('ended', () => {
                currentSpaceClip = Math.floor(Math.random() * spaceAudioClips.length);
                playSpaceAudio();
            });

            spaceAudio.addEventListener('error', (e) => {
                if (spaceStopping) return;
                console.error('Space audio error:', e);
                spaceStatus.textContent = 'Error';
                spaceStatus.className = 'channel-status error';
            });

            spaceAudio.src = clip.url;
            spaceAudio.play().catch(err => {
                console.error('Space play failed:', err);
                spaceStatus.textContent = 'Error';
                spaceStatus.className = 'channel-status error';
            });
        }

        function pauseSpaceAudio() {
            spaceStopping = true;
            if (spaceAudio) {
                spaceAudio.pause();
            }
            spaceStatus.textContent = 'Paused';
            spaceStatus.className = 'channel-status';
            spaceToggleBtn.innerHTML = '&#9654;';
        }

        function stopSpaceAudio() {
            spaceStopping = true;
            if (spaceAudio) {
                spaceAudio.pause();
                spaceAudio.currentTime = 0;
            }
            spaceStatus.textContent = 'Stopped';
            spaceStatus.className = 'channel-status';
            spaceToggleBtn.innerHTML = '&#9654;';
            spaceProgress.style.display = 'none';
            spaceProgressFill.style.width = '0%';
        }

        function toggleSpace() {
            if (spaceAudio && !spaceAudio.paused) {
                pauseSpaceAudio();
            } else if (spaceAudio && spaceAudio.src) {
                spaceStopping = false;
                spaceProgress.style.display = 'flex';
                spaceAudio.play().catch(() => playSpaceAudio());
            } else {
                playSpaceAudio();
            }
        }

        function shuffleSpaceClip() {
            if (spaceAudioClips.length === 0) return;
            currentSpaceClip = Math.floor(Math.random() * spaceAudioClips.length);
            playSpaceAudio();
        }

        // ============== ATC (YouTube) Functions ==============
        async function loadAtcSources() {
            try {
                const response = await fetch('atc-sources.json');
                if (!response.ok) throw new Error('Failed to load ATC sources');
                allAtcSources = await response.json();

                // If we have a saved source, load it
                if (currentAtcSource && allAtcSources.some(s => s.id === currentAtcSource)) {
                    const source = allAtcSources.find(s => s.id === currentAtcSource);
                    currentAtcSourceSpan.textContent = source.name;
                } else {
                    currentAtcSource = null;
                    currentAtcSourceSpan.textContent = 'None';
                    showAtcDisabled();
                }
            } catch (error) {
                console.error('Error loading ATC sources:', error);
                currentAtcSourceSpan.textContent = 'Error loading';
            }
        }

        function showAtcDisabled() {
            youtubeContainer.style.display = 'none';
            atcDisabledMessage.style.display = 'block';
            atcControls.style.display = 'none';
            atcStatus.textContent = 'Ready';
            atcStatus.className = 'channel-status';
        }

        function showAtcEnabled() {
            youtubeContainer.style.display = 'block';
            atcDisabledMessage.style.display = 'none';
            atcControls.style.display = 'flex';
        }

        function createAtcPlayer(videoId) {
            // Destroy existing player if any
            if (atcPlayer) {
                atcPlayer.destroy();
                atcPlayer = null;
                atcPlayerReady = false;
            }

            // Create new player element (preserve close button)
            youtubeContainer.innerHTML = '<button class="theater-close" id="theater-close" title="Close">&times;</button><div id="atc-player"></div>';

            atcPlayer = new YT.Player('atc-player', {
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    iv_load_policy: 3,
                    playsinline: 1
                },
                events: {
                    onReady: onAtcPlayerReady,
                    onStateChange: onAtcPlayerStateChange,
                    onError: onAtcPlayerError
                }
            });

            showAtcEnabled();
        }

        function onYouTubeIframeAPIReady() {
            // Only create player if we have a source selected
            if (currentAtcSource) {
                createAtcPlayer(currentAtcSource);
            }
        }

        function onAtcPlayerReady(event) {
            atcPlayerReady = true;
            atcStatus.textContent = 'Ready';
            atcStatus.className = 'channel-status';
            // Set initial volume
            updateVolumes();
        }

        function onAtcPlayerStateChange(event) {
            switch (event.data) {
                case YT.PlayerState.PLAYING:
                    atcStatus.textContent = 'Playing';
                    atcStatus.className = 'channel-status playing';
                    atcToggleBtn.innerHTML = '&#10074;&#10074;';
                    break;
                case YT.PlayerState.PAUSED:
                    atcStatus.textContent = 'Paused';
                    atcStatus.className = 'channel-status';
                    atcToggleBtn.innerHTML = '&#9654;';
                    break;
                case YT.PlayerState.BUFFERING:
                    atcStatus.textContent = 'Buffering...';
                    atcStatus.className = 'channel-status loading';
                    break;
                case YT.PlayerState.ENDED:
                    // For live streams this shouldn't happen, but handle it
                    atcStatus.textContent = 'Ended';
                    atcStatus.className = 'channel-status';
                    atcToggleBtn.innerHTML = '&#9654;';
                    break;
            }
        }

        function onAtcPlayerError(event) {
            console.error('ATC player error:', event.data);
            atcStatus.textContent = 'Error';
            atcStatus.className = 'channel-status error';
        }

        function toggleAtc() {
            if (!atcPlayerReady || !currentAtcSource) return;
            const state = atcPlayer.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                atcPlayer.pauseVideo();
            } else {
                // Seek to live edge before playing
                atcPlayer.seekTo(atcPlayer.getDuration(), true);
                atcPlayer.playVideo();
            }
        }

        function selectAtcSource(sourceId) {
            const wasPlaying = atcPlayer && atcPlayerReady && atcPlayer.getPlayerState() === YT.PlayerState.PLAYING;

            if (sourceId === null) {
                // None selected
                currentAtcSource = null;
                localStorage.removeItem(SELECTED_ATC_SOURCE_KEY);
                currentAtcSourceSpan.textContent = 'None';

                if (atcPlayer) {
                    atcPlayer.destroy();
                    atcPlayer = null;
                    atcPlayerReady = false;
                }
                showAtcDisabled();
            } else {
                const source = allAtcSources.find(s => s.id === sourceId);
                if (!source) return;

                currentAtcSource = sourceId;
                localStorage.setItem(SELECTED_ATC_SOURCE_KEY, sourceId);
                currentAtcSourceSpan.textContent = source.name;

                // Create or update player
                createAtcPlayer(sourceId);
            }

            closeAtcSourceModal();
        }

        function renderAtcSources() {
            const noneSelected = currentAtcSource === null;
            let html = `
                <div class="tag-item ${noneSelected ? 'selected' : ''}" data-atc-source="none">
                    <span class="tag-name">None</span>
                </div>
            `;

            html += allAtcSources.map(source => `
                <div class="tag-item ${source.id === currentAtcSource ? 'selected' : ''}" data-atc-source="${source.id}">
                    <span class="tag-name">${source.name}</span>
                </div>
            `).join('');

            atcSourceList.innerHTML = html;
        }

        function openAtcSourceModal() {
            atcSourceModal.classList.add('active');
            renderAtcSources();
        }

        function closeAtcSourceModal() {
            atcSourceModal.classList.remove('active');
        }

        function toggleAtcFullscreen() {
            const iframe = youtubeContainer.querySelector('iframe');
            if (!iframe) return;

            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
            } else if (iframe.webkitRequestFullscreen) {
                iframe.webkitRequestFullscreen();
            }
        }

        const theaterOverlay = document.getElementById('theater-overlay');

        function toggleAtcTheater() {
            youtubeContainer.classList.toggle('theater-mode');
            theaterOverlay.classList.toggle('active');
        }

        function closeAtcTheater() {
            youtubeContainer.classList.remove('theater-mode');
            theaterOverlay.classList.remove('active');
        }

        // Load YouTube IFrame API
        function loadYouTubeAPI() {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        // ============== Modal Functions ==============
        function openTagModal() {
            tagModal.classList.add('active');
            tagSearch.value = '';
            renderTags();
            tagSearch.focus();
        }

        function closeTagModal() {
            tagModal.classList.remove('active');
        }

        function openFavoritesModal() {
            favoritesModal.classList.add('active');
            renderFavorites();
        }

        function closeFavoritesModal() {
            favoritesModal.classList.remove('active');
        }

        // Source modal functions
        function openSourceModal() {
            sourceModal.classList.add('active');
            renderSources();
        }

        function closeSourceModal() {
            sourceModal.classList.remove('active');
        }

        // Station info modal functions
        function openStationInfoModal() {
            if (!currentStation) return;
            stationInfoModal.classList.add('active');
            renderStationInfo();
        }

        function closeStationInfoModal() {
            stationInfoModal.classList.remove('active');
        }

        function renderStationInfo() {
            if (!currentStation) return;

            const station = currentStation;
            const isFav = isStationFavorite(FAVORITES_KEY, station.stationuuid);
            const tags = station.tags ? station.tags.split(',').filter(t => t.trim()).slice(0, 5) : [];

            stationInfoContent.innerHTML = `
                <div class="station-info">
                    <div class="station-info-header">
                        ${station.favicon ? `<img src="${station.favicon}" class="station-favicon" onerror="this.style.display='none'">` : ''}
                        <div class="station-info-name">${station.name || 'Unknown Station'}</div>
                    </div>
                    ${station.homepage ? `
                    <div class="station-info-row">
                        <span class="station-info-label">Homepage</span>
                        <span class="station-info-value"><a href="${station.homepage}" target="_blank">${new URL(station.homepage).hostname}</a></span>
                    </div>` : ''}
                    ${station.countrycode ? `
                    <div class="station-info-row">
                        <span class="station-info-label">Country</span>
                        <span class="station-info-value">${station.countrycode}</span>
                    </div>` : ''}
                    ${station.codec ? `
                    <div class="station-info-row">
                        <span class="station-info-label">Codec</span>
                        <span class="station-info-value">${station.codec}${station.bitrate ? ` @ ${station.bitrate} kbps` : ''}</span>
                    </div>` : ''}
                    ${tags.length > 0 ? `
                    <div class="station-info-row">
                        <span class="station-info-label">Tags</span>
                        <span class="station-info-value">
                            <div class="station-info-tags">
                                ${tags.map(t => `<span class="station-info-tag">${t.trim()}</span>`).join('')}
                            </div>
                        </span>
                    </div>` : ''}
                    <div class="station-info-row">
                        <span class="station-info-label">Radio Browser</span>
                        <span class="station-info-value"><a href="https://www.radio-browser.info/history/${station.stationuuid}" target="_blank">View history</a></span>
                    </div>
                    <div class="station-info-actions">
                        <button onclick="toggleFavoriteFromInfo()">${isFav ? heartFilledSvg + ' Unfavorite' : heartOutlineSvg + ' Favorite'}</button>
                    </div>
                </div>
            `;
        }

        function toggleFavoriteFromInfo() {
            toggleFavorite();
            renderStationInfo();
        }

        function renderSources() {
            sourceList.innerHTML = allSources.map(source => `
                <div class="tag-item ${source.json === currentSource ? 'selected' : ''}" data-source="${source.json}">
                    <span class="tag-name">${source.name}</span>
                </div>
            `).join('');
        }

        async function selectSource(sourceJson) {
            const source = allSources.find(s => s.json === sourceJson);
            if (!source) return;

            const wasPlaying = spaceAudio && !spaceAudio.paused;

            currentSource = sourceJson;
            localStorage.setItem(SELECTED_SOURCE_KEY, sourceJson);
            currentSourceSpan.textContent = source.name;
            closeSourceModal();

            // Stop current playback and load new clips
            if (wasPlaying) {
                stopSpaceAudio();
            }
            await loadSpaceClips();

            // Auto-play if was playing before
            if (wasPlaying) {
                shuffleSpaceClip();
            }
        }

        // ============== Curated Ambient Radio Functions ==============
        async function loadCuratedStations() {
            try {
                const response = await fetch(CURATED_STATIONS_FILE);
                if (!response.ok) throw new Error('Failed to load curated stations');
                curatedStations = await response.json();
                createCuratedShuffledPlaylist();
                updateCuratedStationDisplay();
                curatedStatus.textContent = curatedStations.length > 0 ? 'Ready' : 'No stations';
            } catch (err) {
                console.error('Error loading curated stations:', err);
                curatedStations = [];
                curatedStatus.textContent = 'No stations';
            }
        }

        function createCuratedShuffledPlaylist() {
            const indexes = curatedStations.map((_, i) => i);
            curatedShuffledPlaylist = shuffleArray(indexes);
            curatedPlaylistIndex = 0;
        }

        function getAvailableCuratedStations() {
            return curatedStations.filter(s => !isStationBlacklisted(CURATED_BLACKLIST_KEY, s.stationuuid));
        }

        function updateCuratedStationDisplay() {
            const count = getAvailableCuratedStations().length;
            const total = curatedStations.length;
            if (total > 0) {
                currentCuratedStationSpan.textContent = `${count} stations`;
            } else {
                currentCuratedStationSpan.textContent = 'No stations';
            }
        }

        function playCuratedStation(station) {
            if (curatedAudio) {
                curatedAudio.pause();
                curatedAudio.src = '';
            }
            if (curatedBufferingTimeout) {
                clearTimeout(curatedBufferingTimeout);
                curatedBufferingTimeout = null;
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
                if (curatedBufferingTimeout) {
                    clearTimeout(curatedBufferingTimeout);
                    curatedBufferingTimeout = null;
                }
                curatedStatus.textContent = 'Playing';
                curatedStatus.className = 'channel-status playing';
                curatedToggleBtn.innerHTML = '&#10074;&#10074;';
                unblacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
            });

            newAudio.addEventListener('error', (e) => {
                if (curatedAudio !== newAudio || curatedStopping) return;
                if (curatedBufferingTimeout) {
                    clearTimeout(curatedBufferingTimeout);
                    curatedBufferingTimeout = null;
                }
                console.error('Curated playback error:', e);
                blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
                curatedStatus.textContent = 'Unavailable';
                curatedStatus.className = 'channel-status error';
                curatedNowPlaying.textContent = 'Station offline - try another';
            });

            newAudio.addEventListener('waiting', () => {
                if (curatedAudio !== newAudio) return;
                curatedStatus.textContent = 'Buffering...';
                curatedStatus.className = 'channel-status loading';
                if (curatedBufferingTimeout) clearTimeout(curatedBufferingTimeout);
                curatedBufferingTimeout = setTimeout(() => {
                    if (curatedAudio === newAudio && !curatedStopping) {
                        console.log('Curated buffering timeout');
                        blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
                        curatedStatus.textContent = 'Unavailable';
                        curatedStatus.className = 'channel-status error';
                        curatedNowPlaying.textContent = 'Station offline - try another';
                    }
                }, 10000);
            });

            newAudio.src = station.url_resolved;
            newAudio.play().catch(err => {
                if (curatedAudio !== newAudio || curatedStopping) return;
                console.error('Curated play failed:', err);
                blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
                curatedStatus.textContent = 'Unavailable';
                curatedStatus.className = 'channel-status error';
                curatedNowPlaying.textContent = 'Station offline - try another';
            });
        }

        function playCuratedStationWithAutoRetry(station) {
            if (curatedAudio) {
                curatedAudio.pause();
                curatedAudio.src = '';
            }
            if (curatedBufferingTimeout) {
                clearTimeout(curatedBufferingTimeout);
                curatedBufferingTimeout = null;
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
                if (curatedBufferingTimeout) {
                    clearTimeout(curatedBufferingTimeout);
                    curatedBufferingTimeout = null;
                }
                curatedStatus.textContent = 'Playing';
                curatedStatus.className = 'channel-status playing';
                curatedToggleBtn.innerHTML = '&#10074;&#10074;';
                unblacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
            });

            newAudio.addEventListener('error', (e) => {
                if (curatedAudio !== newAudio || curatedStopping) return;
                if (curatedBufferingTimeout) {
                    clearTimeout(curatedBufferingTimeout);
                    curatedBufferingTimeout = null;
                }
                console.error('Curated playback error (auto-retry):', e);
                blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
                playCuratedNext();
            });

            newAudio.addEventListener('waiting', () => {
                if (curatedAudio !== newAudio) return;
                curatedStatus.textContent = 'Buffering...';
                curatedStatus.className = 'channel-status loading';
                if (curatedBufferingTimeout) clearTimeout(curatedBufferingTimeout);
                curatedBufferingTimeout = setTimeout(() => {
                    if (curatedAudio === newAudio && !curatedStopping) {
                        console.log('Curated buffering timeout (auto-retry)');
                        blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
                        playCuratedNext();
                    }
                }, 10000);
            });

            newAudio.src = station.url_resolved;
            newAudio.play().catch(err => {
                if (curatedAudio !== newAudio || curatedStopping) return;
                console.error('Curated play failed (auto-retry):', err);
                blacklistStation(CURATED_BLACKLIST_KEY, station.stationuuid, updateCuratedStationDisplay);
                playCuratedNext();
            });
        }

        function playCuratedRandom() {
            const available = getAvailableCuratedStations();
            if (available.length === 0) {
                curatedStatus.textContent = 'No stations';
                curatedStatus.className = 'channel-status error';
                curatedNowPlaying.textContent = curatedStations.length > 0 ? 'All stations offline' : 'No stations loaded';
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

            curatedStatus.textContent = 'No stations';
            curatedStatus.className = 'channel-status error';
            curatedNowPlaying.textContent = 'All stations offline';
        }

        function stopCurated() {
            curatedStopping = true;
            if (curatedBufferingTimeout) {
                clearTimeout(curatedBufferingTimeout);
                curatedBufferingTimeout = null;
            }
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
            curatedMuteBtn.title = curatedMuted ? 'Unmute' : 'Mute';
            updateVolumes();
        }

        // Curated Station Selection Modal
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

        // Curated Favorites
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

        function exportCuratedFavorites() {
            const favorites = getFavorites(CURATED_FAVORITES_KEY);
            const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ambient-radio-favorites.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importCuratedFavorites() {
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
                        const existing = getFavorites(CURATED_FAVORITES_KEY);
                        const merged = [...existing];
                        imported.forEach(imp => {
                            if (!merged.some(m => m.stationuuid === imp.stationuuid)) {
                                merged.push(imp);
                            }
                        });
                        saveFavorites(CURATED_FAVORITES_KEY, merged);
                        renderCuratedFavorites();
                        updateCuratedFavoriteButton();
                    }
                } catch (err) {
                    console.error('Import failed:', err);
                }
            };
            input.click();
        }

        // Curated Station Info
        function showCuratedStationInfo() {
            if (!currentCuratedStation) return;

            const station = currentCuratedStation;
            const isFav = isStationFavorite(CURATED_FAVORITES_KEY, station.stationuuid);
            const tags = station.tags ? station.tags.split(',').filter(t => t.trim()).slice(0, 5) : [];

            stationInfoContent.innerHTML = `
                <div class="station-info">
                    <div class="station-info-header">
                        ${station.favicon ? `<img class="station-favicon" src="${station.favicon}" alt="" onerror="this.style.display='none'">` : ''}
                        <div class="station-info-name">${station.name}</div>
                    </div>
                    ${tags.length > 0 ? `
                        <div class="station-info-row">
                            <span class="station-info-label">Tags</span>
                            <div class="station-info-tags">
                                ${tags.map(t => `<span class="station-info-tag">${t.trim()}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${station.country ? `
                        <div class="station-info-row">
                            <span class="station-info-label">Country</span>
                            <span class="station-info-value">${station.country}${station.countrycode ? ` (${station.countrycode})` : ''}</span>
                        </div>
                    ` : ''}
                    ${station.codec ? `
                        <div class="station-info-row">
                            <span class="station-info-label">Codec</span>
                            <span class="station-info-value">${station.codec}${station.bitrate ? ` @ ${station.bitrate} kbps` : ''}</span>
                        </div>
                    ` : ''}
                    ${station.homepage ? `
                        <div class="station-info-row">
                            <span class="station-info-label">Homepage</span>
                            <span class="station-info-value"><a href="${station.homepage}" target="_blank">Visit</a></span>
                        </div>
                    ` : ''}
                    <div class="station-info-actions">
                        <button onclick="toggleCuratedFavorite(); showCuratedStationInfo();">
                            ${isFav ? heartFilledSvg : heartOutlineSvg}
                            ${isFav ? 'Remove Favorite' : 'Add Favorite'}
                        </button>
                    </div>
                </div>
            `;

            stationInfoModal.classList.add('active');
        }

        // ============== Event Listeners ==============
        radioToggleBtn.addEventListener('click', toggleRadio);
        radioShuffleBtn.addEventListener('click', playRandomStation);
        radioFavoriteBtn.addEventListener('click', toggleFavorite);
        radioVolumeSlider.addEventListener('input', (e) => {
            radioVolumeValue.textContent = `${e.target.value}%`;
            updateVolumes();
            saveVolumeSettings();
        });

        spaceToggleBtn.addEventListener('click', toggleSpace);
        spaceShuffleBtn.addEventListener('click', shuffleSpaceClip);
        spaceVolumeSlider.addEventListener('input', (e) => {
            spaceVolumeValue.textContent = `${e.target.value}%`;
            updateVolumes();
            saveVolumeSettings();
        });

        atcToggleBtn.addEventListener('click', toggleAtc);
        atcVolumeSlider.addEventListener('input', (e) => {
            atcVolumeValue.textContent = `${e.target.value}%`;
            updateVolumes();
            saveVolumeSettings();
        });

        atcMuteBtn.addEventListener('click', () => {
            atcMuted = !atcMuted;
            atcMuteBtn.innerHTML = atcMuted ? speakerOffSvg : speakerOnSvg;
            atcMuteBtn.title = atcMuted ? 'Unmute' : 'Mute';
            updateVolumes();
        });

        // ATC source and options
        atcSourceBtn.addEventListener('click', openAtcSourceModal);
        atcSourceModalClose.addEventListener('click', closeAtcSourceModal);
        atcSourceModal.addEventListener('click', (e) => {
            if (e.target === atcSourceModal) closeAtcSourceModal();
        });
        atcSourceList.addEventListener('click', (e) => {
            const item = e.target.closest('.tag-item');
            if (item) {
                const sourceId = item.dataset.atcSource;
                selectAtcSource(sourceId === 'none' ? null : sourceId);
            }
        });

        atcFullscreenBtn.addEventListener('click', toggleAtcFullscreen);
        atcTheaterBtn.addEventListener('click', toggleAtcTheater);
        theaterOverlay.addEventListener('click', closeAtcTheater);

        // Close theater mode when clicking close button
        youtubeContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('theater-close')) {
                closeAtcTheater();
            }
        });

        spaceProgressBar.addEventListener('click', (e) => {
            if (spaceAudio && spaceAudio.duration) {
                const rect = spaceProgressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                spaceAudio.currentTime = percent * spaceAudio.duration;
            }
        });

        masterVolumeSlider.addEventListener('input', (e) => {
            masterVolume = e.target.value / 100;
            masterVolumeValue.textContent = `${e.target.value}%`;
            updateVolumes();
            saveVolumeSettings();
        });

        masterMuteBtn.addEventListener('click', () => {
            masterMuted = !masterMuted;
            masterMuteBtn.innerHTML = masterMuted ? speakerOffSvg : speakerOnSvg;
            masterMuteBtn.title = masterMuted ? 'Unmute' : 'Mute';
            updateVolumes();
        });

        radioMuteBtn.addEventListener('click', () => {
            radioMuted = !radioMuted;
            radioMuteBtn.innerHTML = radioMuted ? speakerOffSvg : speakerOnSvg;
            radioMuteBtn.title = radioMuted ? 'Unmute' : 'Mute';
            updateVolumes();
        });

        spaceMuteBtn.addEventListener('click', () => {
            spaceMuted = !spaceMuted;
            spaceMuteBtn.innerHTML = spaceMuted ? speakerOffSvg : speakerOnSvg;
            spaceMuteBtn.title = spaceMuted ? 'Unmute' : 'Mute';
            updateVolumes();
        });

        // Curated channel controls
        curatedToggleBtn.addEventListener('click', toggleCurated);
        curatedShuffleBtn.addEventListener('click', playCuratedRandom);
        curatedFavoriteBtn.addEventListener('click', toggleCuratedFavorite);
        curatedInfoBtn.addEventListener('click', showCuratedStationInfo);
        curatedMuteBtn.addEventListener('click', toggleCuratedMute);
        curatedVolumeSlider.addEventListener('input', (e) => {
            curatedVolumeValue.textContent = `${e.target.value}%`;
            updateVolumes();
            saveVolumeSettings();
        });

        // Curated station selection modal
        curatedStationBtn.addEventListener('click', openCuratedStationModal);
        curatedStationModalClose.addEventListener('click', closeCuratedStationModal);
        curatedStationModal.addEventListener('click', (e) => {
            if (e.target === curatedStationModal) closeCuratedStationModal();
        });
        curatedStationSearch.addEventListener('input', (e) => {
            renderCuratedStationList(e.target.value);
        });

        // Curated favorites modal
        curatedOpenFavoritesBtn.addEventListener('click', openCuratedFavoritesModal);
        curatedFavoritesModalClose.addEventListener('click', closeCuratedFavoritesModal);
        curatedFavoritesModal.addEventListener('click', (e) => {
            if (e.target === curatedFavoritesModal) closeCuratedFavoritesModal();
        });
        curatedExportFavoritesBtn.addEventListener('click', exportCuratedFavorites);
        curatedImportFavoritesBtn.addEventListener('click', importCuratedFavorites);

        // Tag modal
        tagBtn.addEventListener('click', openTagModal);
        tagModalClose.addEventListener('click', closeTagModal);
        tagModal.addEventListener('click', (e) => {
            if (e.target === tagModal) closeTagModal();
        });
        tagSearch.addEventListener('input', (e) => {
            renderTags(e.target.value);
        });
        tagList.addEventListener('click', (e) => {
            const item = e.target.closest('.tag-item');
            if (item) {
                selectTag(item.dataset.tag);
            }
        });

        // Favorites modal
        openFavoritesBtn.addEventListener('click', openFavoritesModal);
        favoritesModalClose.addEventListener('click', closeFavoritesModal);
        favoritesModal.addEventListener('click', (e) => {
            if (e.target === favoritesModal) closeFavoritesModal();
        });
        exportFavoritesBtn.addEventListener('click', exportFavorites);
        importFavoritesBtn.addEventListener('click', importFavorites);

        // Source modal
        sourceBtn.addEventListener('click', openSourceModal);
        sourceModalClose.addEventListener('click', closeSourceModal);
        sourceModal.addEventListener('click', (e) => {
            if (e.target === sourceModal) closeSourceModal();
        });
        sourceList.addEventListener('click', (e) => {
            const item = e.target.closest('.tag-item');
            if (item) {
                selectSource(item.dataset.source);
            }
        });

        // Station info modal
        stationInfoClose.addEventListener('click', closeStationInfoModal);
        stationInfoModal.addEventListener('click', (e) => {
            if (e.target === stationInfoModal) closeStationInfoModal();
        });
        radioInfoBtn.addEventListener('click', openStationInfoModal);

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeTagModal();
                closeFavoritesModal();
                closeSourceModal();
                closeStationInfoModal();
                closeAtcSourceModal();
                closeAtcTheater();
            }
        });

        // ============== Collapsible Channels ==============
        function getCollapsedState() {
            try {
                return JSON.parse(localStorage.getItem(CHANNEL_COLLAPSED_KEY)) || { radio: false, curated: false, atc: false, space: true };
            } catch { return { radio: false, curated: false, atc: false, space: true }; }
        }

        function saveCollapsedState(state) {
            localStorage.setItem(CHANNEL_COLLAPSED_KEY, JSON.stringify(state));
        }

        function toggleChannelCollapsed(channelName) {
            const state = getCollapsedState();
            state[channelName] = !state[channelName];
            saveCollapsedState(state);
            applyCollapsedState();
        }

        function applyCollapsedState() {
            const state = getCollapsedState();
            document.getElementById('radio-channel').classList.toggle('collapsed', state.radio);
            document.getElementById('curated-channel').classList.toggle('collapsed', state.curated);
            document.getElementById('atc-channel').classList.toggle('collapsed', state.atc);
            document.getElementById('space-channel').classList.toggle('collapsed', state.space);
        }

        // Channel header click handlers
        document.querySelectorAll('.channel-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't collapse when clicking on the status badge
                if (e.target.classList.contains('channel-status')) return;
                const channelName = header.dataset.channel;
                if (channelName) toggleChannelCollapsed(channelName);
            });
        });

        // ============== Initialize ==============
        loadVolumeSettings();
        applyCollapsedState();
        currentTagSpan.textContent = currentTag;
        fetchTags();
        fetchStationsByTag(currentTag);
        loadSources();
        loadAtcSources();
        loadYouTubeAPI();
        loadCuratedStations();

        // Prevent blacklisting on page unload
        window.addEventListener('beforeunload', () => {
            radioStopping = true;
            spaceStopping = true;
            curatedStopping = true;
        });
