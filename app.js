/**
 * app.js — GoSong Music Player
 */

/* ── Inline SVGs (bypasses Lucide stale-ref on dynamic icons) ──── */
const SVG = {
    play: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>`,
    volHigh: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    volLow: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`,
    volMute: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`,
    repeat: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
    repeat1: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><line x1="11" y1="10" x2="11" y2="14"/></svg>`,
};

/* ── Genres ─────────────────────────────────────────────────────── */
const GENRES = [
    { id: 'indian', label: '🇮🇳 Indian', icon: 'music-2' },
    { id: 'bollywood', label: '🎬 Bollywood', icon: 'film' },
    { id: 'pop', label: 'Pop', icon: 'mic-2' },
    { id: 'rock', label: 'Rock', icon: 'guitar' },
    { id: 'electronic', label: 'Electronic', icon: 'cpu' },
    { id: 'hiphop', label: 'Hip-Hop', icon: 'radio' },
    { id: 'jazz', label: 'Jazz', icon: 'music' },
    { id: 'classical', label: 'Classical', icon: 'disc' },
    { id: 'metal', label: 'Metal', icon: 'zap' },
    { id: 'ambient', label: 'Ambient', icon: 'cloud' },
    { id: 'folk', label: 'Folk', icon: 'feather' },
    { id: 'reggae', label: 'Reggae', icon: 'sun' },
    { id: 'blues', label: 'Blues', icon: 'cloud-rain' },
    { id: 'rnb', label: 'R&B / Soul', icon: 'heart' },
    { id: 'country', label: 'Country', icon: 'map-pin' },
    { id: 'funk', label: 'Funk', icon: 'activity' },
    { id: 'latin', label: 'Latin', icon: 'flame' },
    { id: 'punk', label: 'Punk', icon: 'zap-off' },
    { id: 'indie', label: 'Indie', icon: 'coffee' },
    { id: 'lounge', label: 'Lounge', icon: 'volume-1' },
    { id: 'world', label: 'World', icon: 'globe' },
    { id: 'soundtrack', label: 'Soundtrack', icon: 'film' },
];

/* ── Liked tracks helpers ────────────────────────────────────────── */
function loadLikedTracks() {
    try {
        const raw = JSON.parse(localStorage.getItem('melodia_liked_v2') || '[]');
        return new Map(raw.map(t => [t.id, t]));
    } catch { return new Map(); }
}

function saveLikedTracks() {
    localStorage.setItem('melodia_liked_v2',
        JSON.stringify([...state.likedMap.values()]));
}

/* ── Recently Played helpers ─────────────────────────────────────── */
const MAX_RECENT = 30;

function loadRecent() {
    try { return JSON.parse(localStorage.getItem('melodia_recent') || '[]'); }
    catch { return []; }
}

function pushRecent(track) {
    let recent = state.recentTracks.filter(t => t.id !== track.id);
    recent.unshift({ id: track.id, title: track.title, artist: track.artist, albumArt: track.albumArt, streamUrl: track.streamUrl, album: track.album, duration: track.duration });
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    state.recentTracks = recent;
    localStorage.setItem('melodia_recent', JSON.stringify(recent));
    updateRecentBadge();
}

/* ── YouTube Liked / Recent helpers ─────────────────────────────── */
function loadYTLiked() {
    try {
        const raw = JSON.parse(localStorage.getItem('melodia_yt_liked') || '[]');
        return new Map(raw.map(v => [v.id, v]));
    } catch { return new Map(); }
}

function saveYTLiked() {
    localStorage.setItem('melodia_yt_liked', JSON.stringify([...state.ytLikedMap.values()]));
}

function loadYTRecent() {
    try { return JSON.parse(localStorage.getItem('melodia_yt_recent') || '[]'); }
    catch { return []; }
}

function pushYTRecent(video) {
    let recent = state.ytRecentTracks.filter(v => v.id !== video.id);
    recent.unshift({ id: video.id, title: video.title, thumb: video.thumb || video.thumbnail || '' });
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    state.ytRecentTracks = recent;
    localStorage.setItem('melodia_yt_recent', JSON.stringify(recent));
    ytUpdateBadges();
}

function ytUpdateBadges() {
    if (ytLikedCountBadge) ytLikedCountBadge.textContent = state.ytLikedMap.size;
    if (ytRecentCountBadge) ytRecentCountBadge.textContent = state.ytRecentTracks.length;
}

/* ── App state ───────────────────────────────────────────────────── */
const state = {
    tracks: [],
    filtered: [],
    currentIndex: -1,   // Index in current filtered list (for next/prev)
    playingTrackId: null, // ← ID of the ACTUALLY playing track (fixes ghost rows)
    isPlaying: false,
    shuffle: false,
    repeat: 'off',
    volume: parseFloat(localStorage.getItem('melodia_volume')) || 0.8,
    prevVolume: parseFloat(localStorage.getItem('melodia_volume')) || 0.8,
    currentGenre: '',
    searchHistory: JSON.parse(localStorage.getItem('gosong_search_history') || '[]'),
    searchQuery: '',
    likedMap: loadLikedTracks(),
    recentTracks: loadRecent(),
    ytLikedMap: loadYTLiked(),      // YouTube specific
    ytRecentTracks: loadYTRecent(), // YouTube specific
    loading: false,
    _skipCount: 0,
    sleepTimer: null, // setTimeout id
    sleepMinutes: 0,
};

/* ── DOM refs ────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const audio = $('audioPlayer');
const genreListEl = $('genreList');
const trackListEl = $('trackList');
const skeletonEl = $('skeletonContainer');
const emptyStateEl = $('emptyState');
const errorStateEl = $('errorState');
const genreTitleEl = $('currentGenreTitle');
const trackCountEl = $('trackCount');
const searchInputEl = $('searchInput');
const shuffleAllBtn = $('shuffleAllBtn');

const playPauseBtn = $('playPauseBtn');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');
const shuffleBtn = $('shuffleBtn');
const repeatBtn = $('repeatBtn');

const progressTrackEl = $('progressTrack');
const progressFillEl = $('progressFill');
const progressThumbEl = $('progressThumb');
const currentTimeEl = $('currentTime');
const progressTooltipEl = $('progressTooltip');

const volumeTrackEl = $('volumeTrack');
const volumeFillEl = $('volumeFill');
const volumeThumbEl = $('volumeThumb');
const volumeBtn = $('volumeBtn');

const playerAlbumArtEl = $('playerAlbumArt');
const albumArtPlaceholderEl = $('albumArtPlaceholder');
const playerTitleEl = $('playerTitle');
const playerArtistEl = $('playerArtist');
const likeBtnEl = $('likeBtn');
const likedPlaylistItemEl = $('likedPlaylistItem');
const likedCountBadgeEl = $('likedCountBadge');
const recentPlaylistItemEl = $('recentPlaylistItem');
const recentCountBadgeEl = $('recentCountBadge');
const toastEl = $('toast');
const retryBtn = $('retryBtn');
const sleepMenuEl = $('sleepMenu');
const sleepBtnEl = $('sleepBtn');
const sleepLabelEl = $('sleepLabel');
const shareBtnEl = $('shareBtn');
const audioSidebarContent = $('audioSidebarContent');
const videoSidebarContent = $('videoSidebarContent');
const ytLikedPlaylistItem = $('ytLikedPlaylistItem');
const ytRecentPlaylistItem = $('ytRecentPlaylistItem');
const ytLikedCountBadge = $('ytLikedCountBadge');
const ytRecentCountBadge = $('ytRecentCountBadge');
const genreBadgeEl = $('genreBadge');

const tooltipEl = $('progressTooltip');
const logoLinkEl = $('logoLink');

/* ── Init ─────────────────────────────────────────────────────────  */
function init() {
    renderGenreList();
    audio.volume = state.volume;
    updateVolumeUI();
    updateLikedBadge();
    updateRecentBadge();
    setView('empty');
    lucide.createIcons();
    playPauseBtn.innerHTML = SVG.play;

    // Library item clicks
    likedPlaylistItemEl.addEventListener('click', selectLikedPlaylist);
    recentPlaylistItemEl.addEventListener('click', selectRecentPlaylist);

    // YouTube Library clicks
    if (ytLikedPlaylistItem) ytLikedPlaylistItem.addEventListener('click', selectYTLikedPlaylist);
    if (ytRecentPlaylistItem) ytRecentPlaylistItem.addEventListener('click', selectYTRecentPlaylist);

    // Delegated track list listener (fixes "can't switch songs" bug)
    trackListEl.addEventListener('click', e => {
        const heartBtn = e.target.closest('.row-heart-btn');
        if (heartBtn) {
            e.stopPropagation();
            toggleLikeByIndex(parseInt(heartBtn.dataset.trackIdx, 10));
            return;
        }
        const row = e.target.closest('.track-row');
        if (row) playAt(parseInt(row.dataset.idx, 10));
    });

    // Final Setup
    if (typeof ytUpdateBadges === 'function') ytUpdateBadges();

    // Rebranding & Feature Activation
    logoLinkEl?.addEventListener('click', () => {
        state.currentGenre = '';
        state.tracks = [];
        state.filtered = [];
        searchInputEl.value = '';
        setView('empty');
        deactivateAll();
    });

    genreBadgeEl?.addEventListener('click', () => {
        if (state.currentGenre && !state.currentGenre.startsWith('__')) {
            selectGenre(state.currentGenre);
        }
    });
    genreTitleEl?.addEventListener('click', () => {
        if (state.currentGenre && !state.currentGenre.startsWith('__')) {
            selectGenre(state.currentGenre);
        }
    });

    playerAlbumArtEl?.addEventListener('click', () => {
        if (state.playingTrackId) {
            window.open(`https://www.jamendo.com/track/${state.playingTrackId}`, '_blank');
        }
    });

    // ── SEARCH HISTORY ──
    const searchHistoryContainer = document.createElement('div');
    searchHistoryContainer.className = 'search-history-dropdown';
    searchHistoryContainer.style.display = 'none';
    searchInputEl.parentNode.appendChild(searchHistoryContainer);

    searchInputEl.addEventListener('focus', () => {
        if (state.searchHistory.length > 0) {
            renderSearchHistory(searchHistoryContainer, searchInputEl);
            searchHistoryContainer.style.display = 'block';
        }
    });

    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrapper')) {
            searchHistoryContainer.style.display = 'none';
        }
    });

    // ── PROGRESS TOOLTIP ──
    progressTrackEl.addEventListener('mousemove', e => {
        if (!audio.duration) return;
        const rect = progressTrackEl.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = pct * audio.duration;
        progressTooltipEl.textContent = fmtTime(time);
        progressTooltipEl.style.left = `${pct * 100}%`;
        progressTooltipEl.classList.add('visible');
    });

    progressTrackEl.addEventListener('mouseleave', () => {
        progressTooltipEl.classList.remove('visible');
    });
}

function addToSearchHistory(q) {
    if (!q || q.trim().length === 0) return;
    q = q.trim();
    let history = state.searchHistory.filter(item => item.toLowerCase() !== q.toLowerCase());
    history.unshift(q);
    if (history.length > 10) history = history.slice(0, 10);
    state.searchHistory = history;
    localStorage.setItem('gosong_search_history', JSON.stringify(history));
}

function renderSearchHistory(container, input) {
    container.innerHTML = `<p class="search-history-title">Recent Searches</p>` +
        state.searchHistory.map(q => `<div class="search-history-item" data-q="${esc(q)}">
            <i data-lucide="clock"></i><span>${esc(q)}</span>
        </div>`).join('');
    lucide.createIcons();
    container.querySelectorAll('.search-history-item').forEach(item => {
        item.onclick = () => {
            const q = item.dataset.q;
            input.value = q;
            container.style.display = 'none';
            input.dispatchEvent(new Event('input'));
        };
    });
}

/* ── Genre sidebar ───────────────────────────────────────────────── */
function renderGenreList() {
    if (!genreListEl) return;
    genreListEl.innerHTML = GENRES.map(g =>
        `<li class="genre-item" data-genre="${g.id}" id="gi-${g.id}">
       <i data-lucide="${g.icon}"></i>${g.label}
     </li>`
    ).join('');
    genreListEl.addEventListener('click', e => {
        const item = e.target.closest('.genre-item');
        if (item) selectGenre(item.dataset.genre);
    });
}

/* ── Sidebar state helpers ───────────────────────────────────────── */
function deactivateAll() {
    document.querySelectorAll('.genre-item').forEach(el => el.classList.remove('active'));
    likedPlaylistItemEl.classList.remove('active');
    recentPlaylistItemEl.classList.remove('active');
    ytLikedPlaylistItem?.classList.remove('active');
    ytRecentPlaylistItem?.classList.remove('active');
}

/* ── Liked playlist ──────────────────────────────────────────────── */
function selectLikedPlaylist() {
    if (state.loading) return;
    state.currentGenre = '__liked__';
    state.searchQuery = '';
    searchInputEl.value = '';

    deactivateAll();
    likedPlaylistItemEl.classList.add('active');
    genreTitleEl.textContent = 'Liked Songs';

    const likedTracks = [...state.likedMap.values()];
    state.tracks = likedTracks;
    state.filtered = likedTracks;

    // ── KEY FIX: find playing track's index in this new list ──────
    state.currentIndex = likedTracks.findIndex(t => t.id === state.playingTrackId);
    trackCountEl.textContent = `${likedTracks.length} songs`;

    if (!likedTracks.length) {
        setView('empty');
        emptyStateEl.querySelector('h2').textContent = 'No Liked Songs Yet';
        emptyStateEl.querySelector('p').textContent = 'Press ♥ on any playing track to add it here';
    } else {
        setView('list'); renderTrackList();
    }
}

/* ── Recently Played playlist ────────────────────────────────────── */
function selectRecentPlaylist() {
    if (state.loading) return;
    state.currentGenre = '__recent__';
    state.searchQuery = '';
    searchInputEl.value = '';

    deactivateAll();
    recentPlaylistItemEl.classList.add('active');
    genreTitleEl.textContent = 'Recently Played';

    const recent = [...state.recentTracks];
    state.tracks = recent;
    state.filtered = recent;
    state.currentIndex = recent.findIndex(t => t.id === state.playingTrackId);
    trackCountEl.textContent = `${recent.length} songs`;

    if (!recent.length) {
        setView('empty');
        emptyStateEl.querySelector('h2').textContent = 'Nothing played yet';
        emptyStateEl.querySelector('p').textContent = 'Your listening history will appear here';
    } else {
        setView('list'); renderTrackList();
    }
}

/* ── YouTube Library Rendering ──────────────────────────────────── */
function selectYTLikedPlaylist() {
    state.currentGenre = '__yt_liked__';
    deactivateAll();
    if (ytLikedPlaylistItem) ytLikedPlaylistItem.classList.add('active');
    genreTitleEl.textContent = 'Liked Videos';

    const results = [...state.ytLikedMap.values()];
    ytState.results = results;
    ytState.resultIndex = -1;

    if (results.length === 0) {
        showToast('No liked videos yet.');
    }

    if (typeof ytRenderResults === 'function') ytRenderResults(results);
    trackCountEl.textContent = `${results.length} liked videos`;
}

function selectYTRecentPlaylist() {
    state.currentGenre = '__yt_recent__';
    deactivateAll();
    if (ytRecentPlaylistItem) ytRecentPlaylistItem.classList.add('active');
    genreTitleEl.textContent = 'Recent Videos';

    const results = [...state.ytRecentTracks];
    ytState.results = results;
    ytState.resultIndex = -1;

    if (results.length === 0) {
        showToast('Listen to some videos first!');
    }

    if (typeof ytRenderResults === 'function') ytRenderResults(results);
    trackCountEl.textContent = `${results.length} recent videos`;
}

/* ── Genre selection ─────────────────────────────────────────────── */
async function selectGenre(genreId) {
    if (state.loading) return;
    state.currentGenre = genreId;
    state.searchQuery = '';
    searchInputEl.value = '';

    const g = GENRES.find(x => x.id === genreId);
    genreTitleEl.textContent = g ? g.label : genreId;
    trackCountEl.textContent = '';

    deactivateAll();
    document.querySelector(`[data-genre="${genreId}"]`)?.classList.add('active');

    setView('skeleton'); renderSkeletons(18); lucide.createIcons();

    try {
        state.loading = true;
        const tracks = await fetchTracksByGenre(genreId, 0, 200);
        if (state.currentGenre !== genreId) return;

        state.tracks = tracks;
        state.filtered = [...tracks];

        // ── KEY FIX: resolve currentIndex in the NEW list ─────────────
        // If the playing track exists in this genre, highlight it; otherwise -1
        state.currentIndex = tracks.findIndex(t => t.id === state.playingTrackId);

        trackCountEl.textContent = `${tracks.length} songs`;
        setView('list'); renderTrackList();
    } catch (err) {
        console.error(err); setView('error');
    } finally {
        state.loading = false; lucide.createIcons();
    }
}

/* ── View manager ────────────────────────────────────────────────── */
function setView(view) {
    if (view !== 'empty') {
        emptyStateEl.querySelector('h2').textContent = 'Welcome to GoSong';
        emptyStateEl.querySelector('p').textContent = 'Pick a genre from the sidebar to start streaming music';
    }
    emptyStateEl.style.display = view === 'empty' ? 'flex' : 'none';
    errorStateEl.style.display = view === 'error' ? 'flex' : 'none';
    skeletonEl.style.display = view === 'skeleton' ? 'block' : 'none';
    trackListEl.style.display = view === 'list' ? 'block' : 'none';
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function renderSkeletons(n = 18) {
    skeletonEl.innerHTML =
        `<div class="track-list-header"><div>#</div><div>Title</div><div>Album</div><div>Time</div></div>` +
        Array.from({ length: n }, () =>
            `<div class="skeleton-row">
         <div class="sk sk-sq"></div>
         <div style="display:flex;flex-direction:column;gap:5px">
           <div class="sk sk-line" style="width:55%"></div>
           <div class="sk sk-line" style="width:38%"></div>
         </div>
         <div class="sk sk-line" style="width:45%"></div>
         <div class="sk sk-line" style="width:28px;margin-left:auto"></div>
       </div>`
        ).join('');
}

/* ── Track list ──────────────────────────────────────────────────── */
function renderTrackList() {
    const tracks = state.filtered;

    if (!tracks.length) {
        trackListEl.innerHTML =
            `<div class="no-results"><i data-lucide="search-x"></i>
       <strong>No results</strong><span>Try a different search term</span></div>`;
        lucide.createIcons(); return;
    }

    const header = `<div class="track-list-header">
    <div>#</div><div>Title</div><div>Album</div><div>Time</div></div>`;

    const rows = tracks.map((t, i) => {
        // ── KEY FIX: use playingTrackId for active state, NOT currentIndex ──
        const isActive = t.id === state.playingTrackId;
        const isPlaying = isActive && state.isPlaying;
        const isLiked = state.likedMap.has(t.id);

        const thumb = t.albumArt
            ? `<img class="track-thumb" src="${t.albumArt}" alt="" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="track-thumb-placeholder" style="display:none"><i data-lucide="music-2"></i></div>`
            : `<div class="track-thumb-placeholder"><i data-lucide="music-2"></i></div>`;

        return `<div class="track-row${isActive ? ' active' : ''}${isPlaying ? ' playing' : ''}" data-idx="${i}">
      <div class="track-number">
        <span class="track-num-text">${i + 1}</span>
        <span class="equalizer"><span class="eq-bar"></span><span class="eq-bar"></span><span class="eq-bar"></span></span>
        <i data-lucide="play" class="track-play-icon"></i>
      </div>
      <div class="track-info-cell">
        ${thumb}
        <div class="track-name-group">
          <span class="t-title">${esc(t.title)}</span>
          <span class="t-artist">${esc(t.artist)}</span>
        </div>
      </div>
      <div class="t-album">${esc(t.album)}</div>
      <div class="t-duration-row">
        <span class="t-duration">${fmtTime(t.duration)}</span>
        <button class="row-heart-btn${isLiked ? ' liked' : ''}" data-track-idx="${i}" title="Like">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
    </div>`;
    }).join('');

    trackListEl.innerHTML = header + rows;
    lucide.createIcons();
}

/* ── Player ──────────────────────────────────────────────────────── */
function playAt(idx) {
    const tracks = state.filtered;
    if (idx < 0 || idx >= tracks.length) return;

    state.currentIndex = idx;
    const track = tracks[idx];
    state.playingTrackId = track.id; // ← Always update the true playing ID

    audio.pause();
    audio.src = track.streamUrl;
    audio.preload = 'auto';
    audio.play().catch(err => console.warn('Playback warning:', err));

    updateNowPlaying(track);
    updateActiveRows();
    pushRecent(track);
}

function updateNowPlaying(track) {
    playerTitleEl.textContent = track.title;
    playerArtistEl.textContent = track.artist;

    if (track.albumArt) {
        playerAlbumArtEl.src = track.albumArt;
        playerAlbumArtEl.style.display = 'block';
        albumArtPlaceholderEl.style.display = 'none';
    } else {
        playerAlbumArtEl.style.display = 'none';
        albumArtPlaceholderEl.style.display = 'flex';
    }

    likeBtnEl.classList.toggle('liked', state.likedMap.has(track.id));
    document.title = `${track.title} — ${track.artist} · GoSong`;

    // ── Media Session API (OS-level controls / lock screen) ──────────
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album || '',
            artwork: track.albumArt
                ? [{ src: track.albumArt, sizes: '300x300', type: 'image/jpeg' }]
                : [],
        });
        navigator.mediaSession.setActionHandler('play', () => audio.play());
        navigator.mediaSession.setActionHandler('pause', () => audio.pause());
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('seekto', d => {
            if (audio.duration) audio.currentTime = d.seekTime;
        });
    }
}

function updatePlayPauseIcon() {
    playPauseBtn.innerHTML = state.isPlaying ? SVG.pause : SVG.play;
}

function updateActiveRows() {
    // ── KEY FIX: match by track ID, not by index ─────────────────────
    document.querySelectorAll('.track-row').forEach(row => {
        const idx = parseInt(row.dataset.idx, 10);
        const track = state.filtered[idx];
        const isAct = Boolean(track && track.id === state.playingTrackId);
        row.classList.toggle('active', isAct);
        row.classList.toggle('playing', isAct && state.isPlaying);
    });
}

function togglePlay() {
    // ── YouTube mode ──────────────────────────────────────────────────
    if (typeof appMode !== 'undefined' && appMode === 'video') {
        if (!ytPlayer || typeof ytPlayer.getPlayerState !== 'function') return;
        const ps = ytPlayer.getPlayerState();
        if (ps === 1 /* PLAYING */) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
        return;
    }
    // ── Audio mode ────────────────────────────────────────────────────
    if (!state.playingTrackId) {
        if (state.filtered.length) playAt(0);
        return;
    }
    if (state.isPlaying) { audio.pause(); }
    else { audio.play().catch(() => { }); }
}

function playNext() {
    // YouTube mode: advance to next search result
    if (typeof appMode !== 'undefined' && appMode === 'video') {
        const next = ytState.resultIndex + 1;
        if (ytState.results[next]) ytPlayResult(next);
        return;
    }
    const n = state.filtered.length;
    if (!n) return;
    const base = state.currentIndex >= 0 ? state.currentIndex : -1;
    const next = state.shuffle
        ? Math.floor(Math.random() * n)
        : (base + 1) % n;
    playAt(next);
}

function playPrev() {
    // YouTube mode: go to previous search result
    if (typeof appMode !== 'undefined' && appMode === 'video') {
        const prev = ytState.resultIndex - 1;
        if (ytState.results[prev]) ytPlayResult(prev);
        return;
    }
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    const n = state.filtered.length;
    if (!n) return;
    const base = state.currentIndex >= 0 ? state.currentIndex : 0;
    playAt(base <= 0 ? n - 1 : base - 1);
}

function toggleShuffle() {
    state.shuffle = !state.shuffle;
    shuffleBtn.classList.toggle('active', state.shuffle);
    showToast(state.shuffle ? 'Shuffle On' : 'Shuffle Off');
}

function toggleRepeat() {
    const cycle = { off: 'all', all: 'one', one: 'off' };
    state.repeat = cycle[state.repeat];
    repeatBtn.innerHTML = state.repeat === 'one' ? SVG.repeat1 : SVG.repeat;
    repeatBtn.classList.toggle('active', state.repeat !== 'off');
    showToast({ off: 'Repeat Off', all: 'Repeat All', one: 'Repeat One' }[state.repeat]);
}

/* ── Audio events ────────────────────────────────────────────────── */
audio.addEventListener('play', () => {
    state.isPlaying = true;
    state._skipCount = 0;
    updatePlayPauseIcon();
    updateActiveRows();
});

audio.addEventListener('pause', () => {
    state.isPlaying = false;
    updatePlayPauseIcon();
    updateActiveRows();
});

audio.addEventListener('timeupdate', () => {
    if (!audio.duration || isNaN(audio.duration)) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    progressFillEl.style.width = `${pct}%`;
    progressThumbEl.style.left = `${pct}%`;
    currentTimeEl.textContent = fmtTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    totalTimeEl.textContent = fmtTime(audio.duration);
});

audio.addEventListener('ended', () => {
    if (state.repeat === 'one') {
        audio.currentTime = 0; audio.play().catch(() => { });
    } else if (state.repeat === 'all' || state.shuffle || state.currentIndex < state.filtered.length - 1) {
        playNext();
    } else {
        state.isPlaying = false; updatePlayPauseIcon(); updateActiveRows();
    }
});

audio.addEventListener('error', () => {
    state._skipCount++;
    showToast('Stream error, skipping to next track...');
    if (state._skipCount > 10) {
        state._skipCount = 0;
        showToast('Many streams unavailable. Try another genre.'); return;
    }
    if (state.filtered.length > 1) playNext();
});

/* ── Progress bar ────────────────────────────────────────────────── */
let draggingProgress = false;
function seekFromEvent(e) {
    const rect = progressTrackEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (typeof appMode !== 'undefined' && appMode === 'video') {
        if (typeof ytPlayer !== 'undefined' && ytPlayer?.getDuration) {
            const dur = ytPlayer.getDuration();
            if (dur) ytPlayer.seekTo(pct * dur, true);
        }
    } else {
        if (audio.duration) audio.currentTime = pct * audio.duration;
    }

    progressFillEl.style.width = `${pct * 100}%`;
    progressThumbEl.style.left = `${pct * 100}%`;
}
progressTrackEl.addEventListener('mousedown', e => { draggingProgress = true; seekFromEvent(e); });
document.addEventListener('mousemove', e => { if (draggingProgress) seekFromEvent(e); });
document.addEventListener('mouseup', () => { draggingProgress = false; });

/* ── Volume ──────────────────────────────────────────────────────── */
let draggingVolume = false;
function setVolumeFromEvent(e) {
    const rect = volumeTrackEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    state.volume = pct;
    audio.volume = pct;
    localStorage.setItem('melodia_volume', pct);
    if (typeof ytPlayer !== 'undefined' && ytPlayer?.setVolume) {
        ytPlayer.setVolume(pct * 100);
    }
    updateVolumeUI();
}
volumeTrackEl.addEventListener('mousedown', e => { draggingVolume = true; setVolumeFromEvent(e); });
document.addEventListener('mousemove', e => { if (draggingVolume) setVolumeFromEvent(e); });
document.addEventListener('mouseup', () => { draggingVolume = false; });

volumeBtn.addEventListener('click', () => {
    if (state.volume > 0) { state.prevVolume = state.volume; state.volume = 0; }
    else { state.volume = state.prevVolume || 0.8; }
    audio.volume = state.volume;
    localStorage.setItem('melodia_volume', state.volume);
    if (typeof ytPlayer !== 'undefined' && ytPlayer?.setVolume) {
        ytPlayer.setVolume(state.volume * 100);
    }
    updateVolumeUI();
});

function updateVolumeUI() {
    const pct = state.volume * 100;
    volumeFillEl.style.width = `${pct}%`;
    volumeThumbEl.style.left = `${pct}%`;
    volumeBtn.innerHTML = state.volume === 0 ? SVG.volMute
        : state.volume < 0.4 ? SVG.volLow : SVG.volHigh;
}

/* ── Like / Unlike ───────────────────────────────────────────────── */
likeBtnEl.addEventListener('click', () => {
    if (appMode === 'video') {
        toggleLikeYT();
        return;
    }
    if (!state.playingTrackId) return;
    const track = state.filtered.find(t => t.id === state.playingTrackId)
        || state.recentTracks.find(t => t.id === state.playingTrackId)
        || [...state.likedMap.values()].find(t => t.id === state.playingTrackId);
    if (track) { toggleLikeTrack(track); likeBtnEl.classList.toggle('liked', state.likedMap.has(track.id)); }
});

function toggleLikeYT() {
    // Current video is in ytState (set by ytLoadVideo)
    const videoId = ytState.currentVideoId;
    if (!videoId) return;

    const video = {
        id: videoId,
        videoId: videoId, // redundant for compatibility
        title: ytState.currentTitle,
        thumb: ytState.currentThumb,
        channel: ytState.currentChannel
    };

    if (state.ytLikedMap.has(videoId)) {
        state.ytLikedMap.delete(videoId);
        showToast('Removed from Liked Videos');
    } else {
        state.ytLikedMap.set(videoId, video);
        showToast('Added to Liked Videos');
    }
    saveYTLiked();
    ytUpdateBadges();

    const isLiked = state.ytLikedMap.has(videoId);
    likeBtnEl.classList.toggle('liked', isLiked);

    // If viewing the liked playlist, refresh it
    if (state.currentGenre === '__yt_liked__') selectYTLikedPlaylist();
}

function toggleLikeByIndex(idx) {
    const track = state.filtered[idx];
    if (!track) return;
    toggleLikeTrack(track);
    const rowBtn = trackListEl.querySelector(`.row-heart-btn[data-track-idx="${idx}"]`);
    if (rowBtn) {
        const isLiked = state.likedMap.has(track.id);
        rowBtn.classList.toggle('liked', isLiked);
        rowBtn.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');
    }
    if (track.id === state.playingTrackId) likeBtnEl.classList.toggle('liked', state.likedMap.has(track.id));
}

function toggleLikeTrack(track) {
    if (state.likedMap.has(track.id)) {
        state.likedMap.delete(track.id); showToast('Removed from Liked Songs');
    } else {
        state.likedMap.set(track.id, { ...track }); showToast('♥ Added to Liked Songs');
    }
    saveLikedTracks(); updateLikedBadge();
    if (state.currentGenre === '__liked__') {
        const likedTracks = [...state.likedMap.values()];
        state.tracks = likedTracks; state.filtered = likedTracks;
        state.currentIndex = likedTracks.findIndex(t => t.id === state.playingTrackId);
        trackCountEl.textContent = `${likedTracks.length} songs`;
        if (!likedTracks.length) setView('empty'); else renderTrackList();
    }
}

function updateLikedBadge() {
    const n = state.likedMap.size;
    likedCountBadgeEl.textContent = n;
    likedCountBadgeEl.style.display = n > 0 ? 'inline-flex' : 'none';
}

function updateRecentBadge() {
    const n = state.recentTracks.length;
    recentCountBadgeEl.textContent = n;
    recentCountBadgeEl.style.display = n > 0 ? 'inline-flex' : 'none';
}

/* ── Share button ────────────────────────────────────────────────── */
shareBtnEl.addEventListener('click', () => {
    if (!state.playingTrackId) { showToast('Play a song first'); return; }
    const track = state.filtered.find(t => t.id === state.playingTrackId)
        || state.recentTracks.find(t => t.id === state.playingTrackId);
    const link = track
        ? `https://www.jamendo.com/track/${state.playingTrackId}`
        : window.location.href;

    navigator.clipboard.writeText(link)
        .then(() => showToast('🔗 Link copied to clipboard!'))
        .catch(() => showToast('Could not copy link'));
});

/* ── Sleep Timer ─────────────────────────────────────────────────── */
sleepBtnEl.addEventListener('click', e => {
    e.stopPropagation();
    sleepMenuEl.classList.toggle('open');
});

document.addEventListener('click', () => sleepMenuEl.classList.remove('open'));

sleepMenuEl.addEventListener('click', e => {
    e.stopPropagation();
    const item = e.target.closest('[data-mins]');
    if (!item) return;

    const mins = parseInt(item.dataset.mins, 10);
    clearTimeout(state.sleepTimer);
    state.sleepTimer = null;
    state.sleepMinutes = mins;

    if (mins === 0) {
        sleepLabelEl.textContent = '';
        sleepBtnEl.classList.remove('active');
        showToast('Sleep timer cancelled');
    } else {
        sleepBtnEl.classList.add('active');
        showToast(`Sleep timer: ${mins} min`);
        updateSleepLabel(mins * 60);

        // Countdown
        let remaining = mins * 60;
        const tick = setInterval(() => {
            remaining--;
            updateSleepLabel(remaining);
            if (remaining <= 0) {
                clearInterval(tick);
                audio.pause();
                if (typeof ytPlayer !== 'undefined' && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
                sleepBtnEl.classList.remove('active');
                sleepLabelEl.textContent = '';
                showToast('😴 Sleep timer ended — goodnight!');
            }
        }, 1000);

        state.sleepTimer = tick;
    }

    sleepMenuEl.classList.remove('open');
});

function updateSleepLabel(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    sleepLabelEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

/* ── Search ──────────────────────────────────────────────────────── */
let searchTimer;
searchInputEl.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.filtered = state.searchQuery
            ? state.tracks.filter(t =>
                t.title.toLowerCase().includes(state.searchQuery) ||
                t.artist.toLowerCase().includes(state.searchQuery) ||
                t.album.toLowerCase().includes(state.searchQuery))
            : [...state.tracks];
        if (state.searchQuery) addToSearchHistory(state.searchQuery);
        state.currentIndex = state.filtered.findIndex(t => t.id === state.playingTrackId);
        trackCountEl.textContent = `${state.filtered.length} songs`;
        if (state.currentGenre) { setView('list'); renderTrackList(); }
    }, 220);
});

/* ── Shuffle All ─────────────────────────────────────────────────── */
shuffleAllBtn.addEventListener('click', () => {
    if (!state.filtered.length) return;
    state.shuffle = true; shuffleBtn.classList.add('active');
    playAt(Math.floor(Math.random() * state.filtered.length));
});

/* ── Retry ───────────────────────────────────────────────────────── */
retryBtn.addEventListener('click', () => {
    if (state.currentGenre && !['__liked__', '__recent__'].includes(state.currentGenre))
        selectGenre(state.currentGenre);
});

/* ── Keyboard shortcuts ──────────────────────────────────────────── */
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': e.preventDefault(); playNext(); break;
        case 'ArrowLeft': e.preventDefault(); playPrev(); break;
        case 'm': case 'M': volumeBtn.click(); break;
        case 's': case 'S': toggleShuffle(); break;
        case 'r': case 'R': toggleRepeat(); break;
    }
});

/* ── Control bindings ────────────────────────────────────────────── */
playPauseBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', playPrev);
nextBtn.addEventListener('click', playNext);
shuffleBtn.addEventListener('click', toggleShuffle);
repeatBtn.addEventListener('click', toggleRepeat);

/* ── Toast ───────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

/* ── Utils ───────────────────────────────────────────────────────── */
function fmtTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

function esc(str = '') {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Boot ────────────────────────────────────────────────────────── */
// init() moved to end of file to ensure all globals are defined

/* ═══════════════════════════════════════════════════════════════════
   YOUTUBE VIDEO MODE
   ═══════════════════════════════════════════════════════════════════ */

const audioModeBtn = $('audioModeBtn');
const videoModeBtn = $('videoModeBtn');
const ytModeEl = $('ytMode');
const ytSearchInput = $('ytSearchInput');
const ytSearchBtn = $('ytSearchBtn');
const ytPlayerWrap = $('ytPlayerWrap');
const ytApiHintEl = $('ytApiHint');
const ytPipBtn = $('ytPipBtn');

let appMode = 'audio'; // 'audio' | 'video'

// Hint text
if (typeof YT_API_KEY !== 'undefined' && YT_API_KEY) {
    ytApiHintEl.textContent = 'Search is enabled.';
} else {
    ytApiHintEl.innerHTML = 'To enable <strong>search</strong>, add a free <a href="https://console.cloud.google.com/" target="_blank" style="color:var(--accent)">YouTube Data API v3 key</a> in youtube.js.';
}

/* ── Switch modes ─────────────────────────────────────────────── */
audioModeBtn.addEventListener('click', () => switchMode('audio'));
videoModeBtn.addEventListener('click', () => switchMode('video'));

function switchMode(mode) {
    appMode = mode;
    const isVideo = mode === 'video';

    audioModeBtn.classList.toggle('active', !isVideo);
    videoModeBtn.classList.toggle('active', isVideo);

    if (isVideo) {
        // Pause audio, show YouTube mode
        audio.pause();
        if (typeof stopWaveform === 'function') stopWaveform(); // Stop for YT mode

        ytModeEl.style.display = 'flex';
        audioSidebarContent.style.display = 'none';
        videoSidebarContent.style.display = 'block';

        if (waveformBarEl) waveformBarEl.style.display = 'none';

        trackListEl.style.display = 'none';
        skeletonEl.style.display = 'none';
        emptyStateEl.style.display = 'none';
        errorStateEl.style.display = 'none';
        genreTitleEl.textContent = 'YouTube Mode';
        trackCountEl.textContent = 'Search · Paste URL · Play';

        // Load YouTube IFrame API
        loadYouTubeAPI();
        if (typeof ytUpdateBadges === 'function') ytUpdateBadges();
        if (typeof ytPlayer !== 'undefined' && ytPlayer?.setVolume) {
            ytPlayer.setVolume(state.volume * 100);
        }
        lucide.createIcons();
    } else {
        // Pause YouTube, restore audio mode
        if (typeof ytPlayer !== 'undefined' && ytPlayer?.pauseVideo) ytPlayer.pauseVideo();
        if (typeof stopWaveform === 'function') stopWaveform();

        ytModeEl.style.display = 'none';
        audioSidebarContent.style.display = 'block';
        videoSidebarContent.style.display = 'none';

        if (waveformBarEl) waveformBarEl.style.display = 'flex';

        // Restore last genre view
        if (state.currentGenre && !['__liked__', '__recent__'].includes(state.currentGenre)) {
            selectGenre(state.currentGenre);
        } else {
            setView('empty');
        }
    }
}

/* ── YouTube search / paste handler ──────────────────────────── */
async function handleYTInput() {
    const val = ytSearchInput.value.trim();
    if (!val) return;

    // 1. Check if it's a URL/ID first (no API call needed)
    const videoId = typeof extractYTVideoId === 'function' ? extractYTVideoId(val) : null;

    if (videoId) {
        ytPlayerWrap.style.display = 'block';
        ytLoadVideo(videoId);
        lucide.createIcons();
        return;
    }

    // 2. Search via YouTube API (if key configured)
    if (typeof YT_API_KEY !== 'undefined' && YT_API_KEY) {
        ytSearchBtn.classList.add('loading');
        ytSearchBtn.disabled = true;
        try {
            const results = await ytSearch(val);
            ytState.results = results;
            ytState.resultIndex = -1;
            ytRenderResults(results);
            showToast(`${results.length} results found`);
        } catch (e) {
            if (e.message === 'QUOTA')
                showToast('Daily quota reached (100 searches/day). Try again tomorrow or paste a YouTube URL.');
            else
                showToast('Search failed — check API key or paste a YouTube URL directly.');
        } finally {
            ytSearchBtn.classList.remove('loading');
            ytSearchBtn.disabled = false;
        }
    } else {
        showToast('Paste a YouTube URL to play, or add an API key to enable search');
    }
}

ytSearchBtn.addEventListener('click', handleYTInput);
ytSearchInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleYTInput(); });

// Auto-detect paste
ytSearchInput.addEventListener('paste', () => {
    setTimeout(() => {
        const val = ytSearchInput.value.trim();
        const videoId = typeof extractYTVideoId === 'function' ? extractYTVideoId(val) : null;
        if (videoId) {
            ytPlayerWrap.style.display = 'block';
            ytLoadVideo(videoId);
            lucide.createIcons();
        }
    }, 50);
});

/* ── Picture-in-Picture ───────────────────────────────────────── */
ytPipBtn.addEventListener('click', async () => {
    try {
        // For YouTube iframe, PiP is done on the iframe's video element
        const iframe = document.querySelector('#ytPlayerDiv iframe');
        if (iframe) {
            // Request PiP on the iframe content (may need user gesture)
            iframe.contentWindow.postMessage('{"event":"command","func":"requestFullscreen","args":""}', '*');
            showToast('Tip: use your browser\'s PiP button in the video controls');
        } else {
            // For native audio — no video to PiP
            showToast('No video is playing. Switch to YouTube mode first.');
        }
    } catch (e) {
        showToast('PiP not supported in this browser');
    }
});

/* ══════════════════════════════════════════════════════════════════
   WAVEFORM SYNC-TO-MUSIC ENGINE (Hybrid Visualizer)
   ══════════════════════════════════════════════════════════════════ */

let audioCtx = null;
let analyser = null;
let dataArray = null;
let visualizerAF = null;
const waveformBarEl = $('waveformBar');
const waveformSpans = waveformBarEl ? waveformBarEl.querySelectorAll('span') : [];

/**
 * Initializes the Audio Analyzer for Audio Mode (Jamendo).
 * If CORS blocks the stream, it gracefully fails and we use Simulation.
 */
function initAnalyser() {
    if (analyser || !audio) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128; // Fast, low-latency spectrum
        const source = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
        console.warn('Audio analyzer blocked by CORS or browser policy. Falling back to simulation.');
        analyser = null;
    }
}

/**
 * Main animation loop. Bridges real frequencies and simulated energy.
 */
function updateVisuals() {
    if (!waveformBarEl || !waveformBarEl.classList.contains('active')) return;

    if (analyser) {
        // --- REAL SYNC MODE (Audio Mode) ---
        analyser.getByteFrequencyData(dataArray);
        // Map 40 spans to the frequency spectrum, excluding extremely high noise frequencies
        for (let i = 0; i < waveformSpans.length; i++) {
            const index = Math.floor((i / waveformSpans.length) * (dataArray.length * 0.7));
            const val = dataArray[index] || 0;
            const scale = 0.2 + (val / 255) * 1.5; // Dynamic scale range [0.2 - 1.7]
            const opacity = 0.4 + (val / 255) * 0.6;

            waveformSpans[i].style.transform = `scaleY(${scale})`;
            waveformSpans[i].style.opacity = opacity;
        }
    } else {
        // --- ENERGY SIMULATOR MODE (YouTube or CORS-blocked) ---
        // Generates organic, high-energy movement that emulates a real visualizer
        const time = Date.now() * 0.005;
        for (let i = 0; i < waveformSpans.length; i++) {
            // Noise-like function combining different sine waves
            const noise = (Math.sin(time + i * 0.3) + Math.sin(time * 0.8 + i * 0.5) + 2) / 4;
            const randomness = Math.random() * 0.3; // Adds "jitter" for energy
            const scale = 0.3 + (noise + randomness) * 1.3;
            const opacity = 0.5 + noise * 0.5;

            waveformSpans[i].style.transform = `scaleY(${scale})`;
            waveformSpans[i].style.opacity = opacity;
        }
    }

    visualizerAF = requestAnimationFrame(updateVisuals);
}

function startWaveform() {
    if (!waveformBarEl) return;
    if (appMode !== 'audio') {
        stopWaveform();
        return;
    }

    // Resume AudioContext if resumed (browsers often start it in 'suspended' state)
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    if (!analyser && appMode === 'audio') {
        initAnalyser(); // Attempt to init for Jamendo
    }

    waveformBarEl.classList.add('active');
    cancelAnimationFrame(visualizerAF);
    visualizerAF = requestAnimationFrame(updateVisuals);
}

function stopWaveform() {
    if (!waveformBarEl) return;
    waveformBarEl.classList.remove('active');
    cancelAnimationFrame(visualizerAF);

    // Reset bar states
    waveformSpans.forEach(span => {
        span.style.transform = 'scaleY(0.2)';
        span.style.opacity = '0.5';
    });
}

// Global Event Listeners
audio.addEventListener('play', startWaveform);
audio.addEventListener('pause', stopWaveform);
audio.addEventListener('ended', stopWaveform);

// Initialize the app
init();
