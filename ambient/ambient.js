// ============== Ambient Soundscape Page ==============

// ============== Constants ==============
const CURATED_STATIONS_FILE = '../ambient-stations.json';
const CURATED_BLACKLIST_KEY = 'ambientCuratedBlacklist';
const CURATED_FAVORITES_KEY = 'ambientCuratedFavorites';
const CURATED_SELECTED_KEY = 'ambientCuratedSelected';
const SELECTED_ATC_SOURCE_KEY = 'ambientAtcSource';
const ATC_SORT_KEY = 'ambientAtcSort';
const CUSTOM_ATC_SOURCES_KEY = 'ambientCustomAtcSources';
const VOLUME_SETTINGS_KEY = 'ambientVolumeSettings';
const CHANNEL_COLLAPSED_KEY = 'ambientChannelCollapsed';

// ============== State ==============
let curatedStations = [];
let curatedAudio = null;
let currentCuratedStation = null;
let curatedStopping = false;
let curatedMuted = false;
let curatedShuffledPlaylist = [];
let curatedPlaylistIndex = 0;
let curatedBufferingTimeout = null;

let allAtcSources = [];
let currentAtcSource = localStorage.getItem(SELECTED_ATC_SOURCE_KEY) || null;
let currentAtcSourceObj = null;
let atcPlayer = null;
let atcPlayerReady = false;
let atcMuted = false;
let atcModalTimeInterval = null;
let atcButtonTimeInterval = null;
let atcSortByTime = localStorage.getItem(ATC_SORT_KEY) === 'time';

let masterMuted = false;
let masterVolume = 1;

// ============== DOM Elements ==============
const masterVolumeSlider = document.getElementById('master-volume');
const masterVolumeValue = document.getElementById('master-volume-value');
const masterMuteBtn = document.getElementById('master-mute');

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
const atcSortToggle = document.getElementById('atc-sort-toggle');
const youtubeContainer = document.getElementById('youtube-container');
const atcDisabledMessage = document.getElementById('atc-disabled-message');
const atcControls = document.getElementById('atc-controls');
const atcFullscreenBtn = document.getElementById('atc-fullscreen');
const atcTheaterBtn = document.getElementById('atc-theater');
const theaterOverlay = document.getElementById('theater-overlay');

const customAtcBtn = document.getElementById('custom-atc-btn');
const customAtcModal = document.getElementById('custom-atc-modal');
const customAtcModalClose = document.getElementById('custom-atc-modal-close');
const customAtcIdInput = document.getElementById('custom-atc-id-input');
const customAtcNameInput = document.getElementById('custom-atc-name-input');
const customAtcSubmit = document.getElementById('custom-atc-submit');
const customAtcHistory = document.getElementById('custom-atc-history');

const stationInfoModal = document.getElementById('station-info-modal');
const stationInfoClose = document.getElementById('station-info-close');
const stationInfoContent = document.getElementById('station-info-content');

// ============== Volume Functions ==============
function updateVolumes() {
    const effectiveMaster = masterMuted ? 0 : masterVolume;
    if (curatedAudio) {
        const curatedVol = curatedMuted ? 0 : (curatedVolumeSlider.value / 100);
        curatedAudio.volume = curatedVol * effectiveMaster;
    }
    if (atcPlayer && atcPlayerReady) {
        const atcVol = atcMuted ? 0 : (atcVolumeSlider.value / 100);
        atcPlayer.setVolume(atcVol * effectiveMaster * 100);
    }
}

function getVolumeSettings() {
    try {
        return JSON.parse(localStorage.getItem(VOLUME_SETTINGS_KEY)) || { master: 100, curated: 50, atc: 50 };
    } catch { return { master: 100, curated: 50, atc: 50 }; }
}

function saveVolumeSettings() {
    const settings = {
        master: parseInt(masterVolumeSlider.value),
        curated: parseInt(curatedVolumeSlider.value),
        atc: parseInt(atcVolumeSlider.value)
    };
    localStorage.setItem(VOLUME_SETTINGS_KEY, JSON.stringify(settings));
}

function loadVolumeSettings() {
    const settings = getVolumeSettings();
    masterVolumeSlider.value = settings.master;
    masterVolumeValue.textContent = `${settings.master}%`;
    masterVolume = settings.master / 100;
    curatedVolumeSlider.value = settings.curated;
    curatedVolumeValue.textContent = `${settings.curated}%`;
    atcVolumeSlider.value = settings.atc;
    atcVolumeValue.textContent = `${settings.atc}%`;
}

// ============== Curated Stations Functions ==============
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
        curatedToggleBtn.innerHTML = '&#9654;';
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
                curatedToggleBtn.innerHTML = '&#9654;';
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
        curatedToggleBtn.innerHTML = '&#9654;';
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
        curatedToggleBtn.innerHTML = '&#9654;';
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
    curatedToggleBtn.innerHTML = '&#9654;';
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

// ============== Curated Station Modal ==============
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

    const filteredStations = curatedStations.filter(s =>
        s.name.toLowerCase().includes(filterLower) ||
        (s.tags && s.tags.toLowerCase().includes(filterLower))
    );

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

// ============== Curated Favorites ==============
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
    exportFavoritesFile(CURATED_FAVORITES_KEY, 'ambient-soundscape-favorites.json');
}

function importCuratedFavorites() {
    importFavoritesFile(CURATED_FAVORITES_KEY, () => {
        renderCuratedFavorites();
        updateCuratedFavoriteButton();
    });
}

// ============== Curated Station Info ==============
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

function closeStationInfoModal() {
    stationInfoModal.classList.remove('active');
}

// ============== ATC (YouTube) Functions ==============
function getLocalTimeMinutes(timezone) {
    try {
        const date = new Date();
        const timeStr = date.toLocaleTimeString('en-US', {
            timeZone: timezone,
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    } catch (e) {
        return 0;
    }
}

function formatLocalTime(timezone) {
    try {
        return new Date().toLocaleTimeString(undefined, {
            timeZone: timezone,
            hour: 'numeric',
            minute: '2-digit'
        });
    } catch (e) {
        return '';
    }
}

function updateAtcSourceButtonTime() {
    if (!currentAtcSourceObj || !currentAtcSourceObj.timezone) return;
    const time = formatLocalTime(currentAtcSourceObj.timezone);
    currentAtcSourceSpan.textContent = time ? `${currentAtcSourceObj.name} · ${time}` : currentAtcSourceObj.name;
}

function startAtcButtonTimeInterval() {
    if (atcButtonTimeInterval) clearInterval(atcButtonTimeInterval);
    updateAtcSourceButtonTime();
    atcButtonTimeInterval = setInterval(updateAtcSourceButtonTime, 1000);
}

function stopAtcButtonTimeInterval() {
    if (atcButtonTimeInterval) {
        clearInterval(atcButtonTimeInterval);
        atcButtonTimeInterval = null;
    }
}

async function loadAtcSources() {
    try {
        const response = await fetch('../atc-sources.json');
        if (!response.ok) throw new Error('Failed to load ATC sources');
        allAtcSources = await response.json();

        if (currentAtcSource) {
            // Check predefined sources first
            let source = allAtcSources.find(s => s.id === currentAtcSource);
            // Then check custom sources
            if (!source) {
                const customSources = getCustomAtcSources();
                source = customSources.find(s => s.id === currentAtcSource);
            }

            if (source) {
                currentAtcSourceObj = source;
                if (source.timezone) {
                    startAtcButtonTimeInterval();
                } else {
                    currentAtcSourceSpan.textContent = source.name;
                }
            } else {
                currentAtcSource = null;
                currentAtcSourceObj = null;
                currentAtcSourceSpan.textContent = 'None';
                showAtcDisabled();
            }
        } else {
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
    if (atcPlayer) {
        atcPlayer.destroy();
        atcPlayer = null;
        atcPlayerReady = false;
    }

    atcToggleBtn.innerHTML = '&#9654;';
    atcStatus.textContent = 'Loading...';
    atcStatus.className = 'channel-status loading';

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

// Make this function global for YouTube API callback
window.onYouTubeIframeAPIReady = function() {
    if (currentAtcSource) {
        createAtcPlayer(currentAtcSource);
    }
};

function onAtcPlayerReady(event) {
    atcPlayerReady = true;
    atcStatus.textContent = 'Ready';
    atcStatus.className = 'channel-status';
    atcToggleBtn.innerHTML = '&#9654;';
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
    atcToggleBtn.innerHTML = '&#9654;';
}

function toggleAtc() {
    if (!atcPlayerReady || !currentAtcSource) return;
    const state = atcPlayer.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        atcPlayer.pauseVideo();
    } else {
        atcPlayer.seekTo(atcPlayer.getDuration(), true);
        atcPlayer.playVideo();
    }
}

function selectAtcSource(sourceId) {
    if (sourceId === null) {
        currentAtcSource = null;
        currentAtcSourceObj = null;
        localStorage.removeItem(SELECTED_ATC_SOURCE_KEY);
        currentAtcSourceSpan.textContent = 'None';
        stopAtcButtonTimeInterval();

        if (atcPlayer) {
            atcPlayer.destroy();
            atcPlayer = null;
            atcPlayerReady = false;
        }
        atcToggleBtn.innerHTML = '&#9654;';
        showAtcDisabled();
    } else {
        // Check both predefined and custom sources
        let source = allAtcSources.find(s => s.id === sourceId);
        if (!source) {
            const customSources = getCustomAtcSources();
            source = customSources.find(s => s.id === sourceId);
        }
        if (!source) {
            // Create minimal source object for unknown IDs
            source = { id: sourceId, name: `Custom: ${sourceId}`, custom: true };
        }

        currentAtcSource = sourceId;
        currentAtcSourceObj = source;
        localStorage.setItem(SELECTED_ATC_SOURCE_KEY, sourceId);

        if (source.timezone) {
            startAtcButtonTimeInterval();
        } else {
            stopAtcButtonTimeInterval();
            currentAtcSourceSpan.textContent = source.name;
        }

        createAtcPlayer(sourceId);
    }

    closeAtcSourceModal();
}

function getSortedAtcSources() {
    const sources = [...allAtcSources];
    if (atcSortByTime) {
        sources.sort((a, b) => {
            const timeA = a.timezone ? getLocalTimeMinutes(a.timezone) : 0;
            const timeB = b.timezone ? getLocalTimeMinutes(b.timezone) : 0;
            return timeA - timeB;
        });
    } else {
        sources.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sources;
}

function toggleAtcSort() {
    atcSortByTime = !atcSortByTime;
    localStorage.setItem(ATC_SORT_KEY, atcSortByTime ? 'time' : 'name');
    renderAtcSources();
}

function renderAtcSources() {
    const noneSelected = currentAtcSource === null;
    const sortedSources = getSortedAtcSources();
    const customSources = getCustomAtcSources();

    // Update sort toggle button text
    atcSortToggle.textContent = atcSortByTime ? '⏱ Time' : 'A-Z';
    atcSortToggle.title = atcSortByTime ? 'Sorted by time (click to sort by name)' : 'Sorted by name (click to sort by time)';

    let html = `
        <div class="tag-item ${noneSelected ? 'selected' : ''}" data-atc-source="none">
            <span class="tag-name">None</span>
            <span class="tag-time"></span>
        </div>
    `;

    // Render custom sources first with delete button
    if (customSources.length > 0) {
        html += customSources.map(source => `
            <div class="tag-item ${source.id === currentAtcSource ? 'selected' : ''}" data-atc-source="${source.id}">
                <span class="tag-name">${escapeHtml(source.name)}</span>
                <span class="custom-delete-btn" data-custom-delete="${source.id}" title="Remove">&times;</span>
            </div>
        `).join('');
    }

    html += sortedSources.map(source => {
        const time = source.timezone ? formatLocalTime(source.timezone) : '';
        return `
            <div class="tag-item ${source.id === currentAtcSource ? 'selected' : ''}" data-atc-source="${source.id}">
                <span class="tag-name">${source.name}</span>
                <span class="tag-time">${time}</span>
            </div>
        `;
    }).join('');

    atcSourceList.innerHTML = html;
}

function updateAtcModalTimes() {
    const timeSpans = atcSourceList.querySelectorAll('.tag-item[data-atc-source]');
    timeSpans.forEach(item => {
        const sourceId = item.dataset.atcSource;
        if (sourceId === 'none') return;
        const source = allAtcSources.find(s => s.id === sourceId);
        if (source && source.timezone) {
            const timeSpan = item.querySelector('.tag-time');
            if (timeSpan) {
                timeSpan.textContent = formatLocalTime(source.timezone);
            }
        }
    });
}

function openAtcSourceModal() {
    atcSourceModal.classList.add('active');
    renderAtcSources();
    if (atcModalTimeInterval) clearInterval(atcModalTimeInterval);
    atcModalTimeInterval = setInterval(updateAtcModalTimes, 1000);
}

function closeAtcSourceModal() {
    atcSourceModal.classList.remove('active');
    if (atcModalTimeInterval) {
        clearInterval(atcModalTimeInterval);
        atcModalTimeInterval = null;
    }
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

function toggleAtcTheater() {
    youtubeContainer.classList.toggle('theater-mode');
    theaterOverlay.classList.toggle('active');
}

function closeAtcTheater() {
    youtubeContainer.classList.remove('theater-mode');
    theaterOverlay.classList.remove('active');
}

function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// ============== Custom ATC Sources ==============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCustomAtcSources() {
    try {
        return JSON.parse(localStorage.getItem(CUSTOM_ATC_SOURCES_KEY)) || [];
    } catch { return []; }
}

function saveCustomAtcSources(sources) {
    localStorage.setItem(CUSTOM_ATC_SOURCES_KEY, JSON.stringify(sources));
}

function extractYouTubeId(input) {
    const trimmed = input.trim();

    // Try bare ID (11 characters, alphanumeric with - and _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    // Try various YouTube URL formats
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) return match[1];
    }

    return null;
}

function addCustomAtcSource(id, name) {
    const sources = getCustomAtcSources();

    // Remove if already exists (will re-add to top)
    const filtered = sources.filter(s => s.id !== id);

    // Add to beginning
    filtered.unshift({
        id,
        name: name || `Custom: ${id}`,
        custom: true
    });

    // Keep only last 20
    if (filtered.length > 20) {
        filtered.length = 20;
    }

    saveCustomAtcSources(filtered);
}

function removeCustomAtcSource(id) {
    const sources = getCustomAtcSources();
    const filtered = sources.filter(s => s.id !== id);
    saveCustomAtcSources(filtered);

    // If currently playing, clear it
    if (currentAtcSource === id) {
        selectAtcSource(null);
    }
}

function openCustomAtcModal() {
    customAtcIdInput.value = '';
    customAtcNameInput.value = '';
    renderCustomAtcHistory();
    customAtcModal.classList.add('active');
    customAtcIdInput.focus();
}

function closeCustomAtcModal() {
    customAtcModal.classList.remove('active');
}

function renderCustomAtcHistory() {
    const sources = getCustomAtcSources();

    if (sources.length === 0) {
        customAtcHistory.innerHTML = '';
        return;
    }

    customAtcHistory.innerHTML = `
        <div class="section-label">Recent Custom Streams</div>
        <div class="tag-list">
            ${sources.map(source => `
                <div class="tag-item ${source.id === currentAtcSource ? 'selected' : ''}" data-custom-id="${source.id}">
                    <span class="tag-name" data-custom-play="${source.id}">${escapeHtml(source.name)}</span>
                    <span class="custom-delete-btn" data-custom-delete="${source.id}" title="Remove">&times;</span>
                </div>
            `).join('')}
        </div>
    `;
}

function submitCustomAtcSource() {
    const input = customAtcIdInput.value;
    let name = customAtcNameInput.value.trim();

    const videoId = extractYouTubeId(input);

    if (!videoId) {
        alert('Invalid YouTube ID or URL. Please enter an 11-character video ID or a valid YouTube URL.');
        return;
    }

    // Limit name length to prevent UI issues
    if (name.length > 100) {
        name = name.substring(0, 100);
    }

    addCustomAtcSource(videoId, name);
    closeCustomAtcModal();
    closeAtcSourceModal();
    selectAtcSource(videoId);
}

// ============== Collapsible Channels ==============
function applyCollapsedState() {
    const state = getCollapsedState(CHANNEL_COLLAPSED_KEY, { curated: false, atc: false });
    document.getElementById('curated-channel').classList.toggle('collapsed', state.curated);
    document.getElementById('atc-channel').classList.toggle('collapsed', state.atc);
}

// ============== Event Listeners ==============
// Master volume
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

// Curated channel controls
curatedToggleBtn.addEventListener('click', toggleCurated);
curatedShuffleBtn.addEventListener('click', playCuratedRandom);
curatedFavoriteBtn.addEventListener('click', toggleCuratedFavorite);
curatedInfoBtn.addEventListener('click', showCuratedStationInfo);
curatedMuteBtn.addEventListener('click', () => {
    curatedMuted = !curatedMuted;
    curatedMuteBtn.innerHTML = curatedMuted ? speakerOffSvg : speakerOnSvg;
    curatedMuteBtn.title = curatedMuted ? 'Unmute' : 'Mute';
    updateVolumes();
});
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

// ATC controls
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

// ATC source modal
atcSourceBtn.addEventListener('click', openAtcSourceModal);
atcSourceModalClose.addEventListener('click', closeAtcSourceModal);
atcSortToggle.addEventListener('click', toggleAtcSort);
atcSourceModal.addEventListener('click', (e) => {
    if (e.target === atcSourceModal) closeAtcSourceModal();
});
atcSourceList.addEventListener('click', (e) => {
    // Handle delete button for custom sources
    const deleteBtn = e.target.closest('[data-custom-delete]');
    if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.customDelete;
        removeCustomAtcSource(id);
        renderAtcSources();
        return;
    }

    // Handle source selection
    const item = e.target.closest('.tag-item');
    if (item) {
        const sourceId = item.dataset.atcSource;
        selectAtcSource(sourceId === 'none' ? null : sourceId);
    }
});

// ATC theater/fullscreen
atcFullscreenBtn.addEventListener('click', toggleAtcFullscreen);
atcTheaterBtn.addEventListener('click', toggleAtcTheater);
theaterOverlay.addEventListener('click', closeAtcTheater);

// Custom ATC modal
customAtcBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openCustomAtcModal();
});
customAtcModalClose.addEventListener('click', closeCustomAtcModal);
customAtcModal.addEventListener('click', (e) => {
    if (e.target === customAtcModal) closeCustomAtcModal();
});
customAtcSubmit.addEventListener('click', submitCustomAtcSource);
customAtcIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitCustomAtcSource();
    }
});
customAtcHistory.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('[data-custom-delete]');
    if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.dataset.customDelete;
        removeCustomAtcSource(id);
        renderCustomAtcHistory();
        return;
    }

    const playItem = e.target.closest('[data-custom-play]');
    if (playItem) {
        const id = playItem.dataset.customPlay;
        closeCustomAtcModal();
        selectAtcSource(id);
    }
});
// Use event delegation for theater close button (survives player recreation)
youtubeContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('theater-close') || e.target.id === 'theater-close') {
        closeAtcTheater();
    }
});

// Station info modal
stationInfoClose.addEventListener('click', closeStationInfoModal);
stationInfoModal.addEventListener('click', (e) => {
    if (e.target === stationInfoModal) closeStationInfoModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCuratedStationModal();
        closeCuratedFavoritesModal();
        closeAtcSourceModal();
        closeStationInfoModal();
        closeAtcTheater();
        closeCustomAtcModal();
    }
});

// Collapsible channels
setupCollapsibleChannels(CHANNEL_COLLAPSED_KEY, { curated: false, atc: false }, applyCollapsedState);

// ============== Initialize ==============
loadVolumeSettings();
applyCollapsedState();
loadCuratedStations();
loadAtcSources();
loadYouTubeAPI();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    curatedStopping = true;
    stopAtcButtonTimeInterval();
    if (atcModalTimeInterval) {
        clearInterval(atcModalTimeInterval);
        atcModalTimeInterval = null;
    }
});
