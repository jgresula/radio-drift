// ============== Radio Roulette Page ==============

// ============== Constants ==============
const BLACKLIST_KEY = 'ambientRadioBlacklist';
const FAVORITES_KEY = 'ambientRadioFavorites';
const TAGS_CACHE_KEY = 'ambientRadioTags';
const SELECTED_TAG_KEY = 'ambientRadioSelectedTag';
const VOLUME_SETTINGS_KEY = 'rouletteVolumeSettings';
const CHANNEL_COLLAPSED_KEY = 'rouletteChannelCollapsed';

// ============== State ==============
let radioAudio = null;
let currentStation = null;
let stations = [];
let shuffledPlaylist = [];
let playlistIndex = 0;
let allTags = [];
let currentTag = localStorage.getItem(SELECTED_TAG_KEY) || 'ambient';
let radioStopping = false;
let radioMuted = false;
let retryCount = 0;
let radioBufferingTimeout = null;

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
const radioMuteBtn = document.getElementById('radio-mute');
const tagBtn = document.getElementById('tag-btn');
const currentTagSpan = document.getElementById('current-tag');

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

const stationInfoModal = document.getElementById('station-info-modal');
const stationInfoClose = document.getElementById('station-info-close');
const stationInfoContent = document.getElementById('station-info-content');

// ============== Volume Functions ==============
function updateVolume() {
    if (radioAudio) {
        const radioVol = radioMuted ? 0 : (radioVolumeSlider.value / 100);
        radioAudio.volume = radioVol;
    }
}

function getVolumeSettings() {
    try {
        return JSON.parse(localStorage.getItem(VOLUME_SETTINGS_KEY)) || { radio: 50 };
    } catch { return { radio: 50 }; }
}

function saveVolumeSettings() {
    const settings = { radio: parseInt(radioVolumeSlider.value) };
    localStorage.setItem(VOLUME_SETTINGS_KEY, JSON.stringify(settings));
}

function loadVolumeSettings() {
    const settings = getVolumeSettings();
    radioVolumeSlider.value = settings.radio;
    radioVolumeValue.textContent = `${settings.radio}%`;
}

// ============== Playlist Functions ==============
function createShuffledPlaylist() {
    const indexes = stations.map((_, i) => i);
    shuffledPlaylist = shuffleArray(indexes);
    playlistIndex = 0;
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

    if (wasPlaying) {
        playRandomStation();
    }
}

// ============== Station Fetching ==============
async function fetchStationsByTag(tag) {
    const wasPlaying = radioAudio && !radioAudio.paused;

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

        createShuffledPlaylist();
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

// ============== Playback Functions ==============
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
    updateVolume();

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
        if (radioBufferingTimeout) clearTimeout(radioBufferingTimeout);
        radioBufferingTimeout = setTimeout(() => {
            if (radioAudio === newAudio && !radioStopping) {
                console.log('Buffering timeout, skipping to next station');
                playRandomStation();
            }
        }, 10000);
    });

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

    let attempts = 0;
    while (attempts < stations.length) {
        const stationIndex = shuffledPlaylist[playlistIndex];
        const station = stations[stationIndex];
        playlistIndex = (playlistIndex + 1) % shuffledPlaylist.length;

        if (!isStationBlacklisted(BLACKLIST_KEY, station.stationuuid)) {
            playStation(station);
            return;
        }
        attempts++;
    }

    radioNowPlaying.textContent = 'All stations temporarily unavailable';
}

function playRandomStation() {
    playNextStation();
}

function checkMediaSessionMetadata() {
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

// ============== Favorites Functions ==============
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
    exportFavoritesFile(FAVORITES_KEY, 'radio-roulette-favorites.json');
}

function importFavorites() {
    importFavoritesFile(FAVORITES_KEY, () => {
        renderFavorites();
        updateFavoriteButton();
    });
}

// ============== Station Info ==============
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

function openStationInfoModal() {
    if (!currentStation) return;
    stationInfoModal.classList.add('active');
    renderStationInfo();
}

function closeStationInfoModal() {
    stationInfoModal.classList.remove('active');
}

// ============== Collapsible Channels ==============
function applyCollapsedState() {
    const state = getCollapsedState(CHANNEL_COLLAPSED_KEY, { radio: false });
    document.getElementById('radio-channel').classList.toggle('collapsed', state.radio);
}

// ============== Event Listeners ==============
radioToggleBtn.addEventListener('click', toggleRadio);
radioShuffleBtn.addEventListener('click', playRandomStation);
radioFavoriteBtn.addEventListener('click', toggleFavorite);
radioVolumeSlider.addEventListener('input', (e) => {
    radioVolumeValue.textContent = `${e.target.value}%`;
    updateVolume();
    saveVolumeSettings();
});

radioMuteBtn.addEventListener('click', () => {
    radioMuted = !radioMuted;
    radioMuteBtn.innerHTML = radioMuted ? speakerOffSvg : speakerOnSvg;
    radioMuteBtn.title = radioMuted ? 'Unmute' : 'Mute';
    updateVolume();
});

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
        closeStationInfoModal();
    }
});

// Collapsible channels
setupCollapsibleChannels(CHANNEL_COLLAPSED_KEY, { radio: false }, applyCollapsedState);

// ============== Initialize ==============
loadVolumeSettings();
applyCollapsedState();
currentTagSpan.textContent = currentTag;
fetchTags();
fetchStationsByTag(currentTag);

// Prevent blacklisting on page unload
window.addEventListener('beforeunload', () => {
    radioStopping = true;
});
