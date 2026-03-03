/**
 * youtube.js — YouTube Video Mode for GoSong
 * Supports: URL/ID paste (no API key), full search (optional API key)
 */

const YT_API_KEY = 'AIzaSyBHYWC93oQ5Rr3htFLH2XpfNTErQxyk1DQ';

/* ── YouTube IFrame API bootstrap ──────────────────────────────── */
let ytPlayer = null;
let ytAPIReady = false;
let ytPendingVideoId = null;

function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) { ytAPIReady = true; return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
}

window.onYouTubeIframeAPIReady = function () {
    ytAPIReady = true;
    ytPlayer = new YT.Player('ytPlayerDiv', {
        height: '100%',
        width: '100%',
        playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, origin: window.location.origin },
        events: { onStateChange: onYTStateChange, onError: onYTError },
    });
    if (ytPendingVideoId) {
        ytLoadVideo(ytPendingVideoId);
        ytPendingVideoId = null;
    }
};

/* ── Progress polling (replaces audio timeupdate for YT mode) ──── */
let ytProgressInterval = null;

function ytStartProgressPoll() {
    clearInterval(ytProgressInterval);
    ytProgressInterval = setInterval(() => {
        if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
        try {
            const cur = ytPlayer.getCurrentTime() || 0;
            const dur = ytPlayer.getDuration() || 0;
            if (!dur) return;
            const pct = (cur / dur) * 100;

            // Desktop UI
            document.getElementById('progressFill').style.width = `${pct}%`;
            document.getElementById('progressThumb').style.left = `${pct}%`;
            document.getElementById('currentTime').textContent = fmtYT(cur);
            document.getElementById('totalTime').textContent = fmtYT(dur);

            // Mobile UI (overlay + mini-player)
            const mMiniFill = document.getElementById('miniProgressFill');
            const mOFill = document.getElementById('overlayProgressFill');
            const mOCurTime = document.getElementById('overlayCurrentTime');
            const mOTotTime = document.getElementById('overlayTotalTime');

            if (mMiniFill) mMiniFill.style.width = `${pct}%`;
            if (mOFill) mOFill.style.width = `${pct}%`;
            if (mOCurTime) mOCurTime.textContent = fmtYT(cur);
            if (mOTotTime) mOTotTime.textContent = fmtYT(dur);
        } catch (_) { }
    }, 500);
}

function ytStopProgressPoll() {
    clearInterval(ytProgressInterval);
    ytProgressInterval = null;
}

function fmtYT(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── YT player state changes ────────────────────────────────────── */
function onYTStateChange(event) {
    const S = YT.PlayerState;

    if (event.data === S.PLAYING) {
        ytStartProgressPoll();
        // Update play/pause button to show PAUSE icon
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="4" x2="6" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/></svg>`;
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
        ytUpdatePlayerBar();
    }

    if (event.data === S.PAUSED) {
        ytStopProgressPoll();
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }

    if (event.data === S.ENDED) {
        ytStopProgressPoll();
        // Auto-advance to next result (only if in video mode)
        if (appMode === 'video') {
            const next = ytState.resultIndex + 1;
            if (ytState.results[next]) ytPlayResult(next);
        }
    }
}

function onYTError() {
    showToast('Video unavailable. Try another result.');
}

/* ── YouTube state ──────────────────────────────────────────────── */
const ytState = {
    results: [],
    resultIndex: -1,
    currentVideoId: '',
    currentTitle: '',
    currentChannel: '',
    currentThumb: '',
};

/* ── Toggle Like from Grid/Sidebar Card ────────────────────────── */
function ytToggleLikeFromCard(idx, btnEl) {
    const video = ytState.results[idx];
    if (!video) return;

    const vidId = video.videoId || video.id;
    if (typeof state !== 'undefined' && state.ytLikedMap) {
        if (state.ytLikedMap.has(vidId)) {
            state.ytLikedMap.delete(vidId);
            btnEl.classList.remove('liked');
            btnEl.querySelector('svg').setAttribute('fill', 'none');
            showToast('Removed from Liked Videos');
        } else {
            const videoObj = { ...video, thumb: video.thumb || video.thumbnail || '' };
            state.ytLikedMap.set(vidId, videoObj);
            btnEl.classList.add('liked');
            btnEl.querySelector('svg').setAttribute('fill', 'currentColor');
            showToast('Added to Liked Videos');
        }
        if (typeof saveYTLiked === 'function') saveYTLiked();
        if (typeof ytUpdateBadges === 'function') ytUpdateBadges();

        // Sync main player heart if this is the currently playing video
        if (vidId === ytState.currentVideoId) {
            const likeBtn = document.getElementById('likeBtn');
            if (likeBtn) likeBtn.classList.toggle('liked', state.ytLikedMap.has(vidId));
        }
    }
}

/* ── Load a video by ID ─────────────────────────────────────────── */
function ytLoadVideo(videoId, title, channel, thumb) {
    if (!ytAPIReady || !ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
        ytPendingVideoId = videoId;
        return;
    }
    ytPlayer.loadVideoById(videoId);
    ytState.currentVideoId = videoId;

    // Sync volume on load
    if (typeof state !== 'undefined' && state.volume !== undefined) {
        ytPlayer.setVolume(state.volume * 100);
    }


    if (title) {
        ytState.currentTitle = title;
        ytState.currentChannel = channel || '';
        ytState.currentThumb = thumb || '';
        ytUpdatePlayerBar();
    }

    // Push to recent
    if (typeof pushYTRecent === 'function') {
        pushYTRecent({ id: videoId, title, thumb: thumb || '' });
    }
}

function ytUpdatePlayerBar() {
    const data = ytPlayer?.getVideoData?.() || {};
    const title = ytState.currentTitle || data.title || 'YouTube Video';
    const channel = ytState.currentChannel || data.author || '';
    const thumb = ytState.currentThumb;

    const titleEl = document.getElementById('playerTitle');
    const artistEl = document.getElementById('playerArtist');
    const artEl = document.getElementById('playerAlbumArt');
    const phEl = document.getElementById('albumArtPlaceholder');

    if (titleEl) titleEl.textContent = title;
    if (artistEl) artistEl.textContent = channel;

    // Update Like button state for YouTube
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn && typeof state !== 'undefined' && state.ytLikedMap) {
        likeBtn.classList.toggle('liked', state.ytLikedMap.has(ytState.currentVideoId));
    }

    if (thumb && artEl) {
        artEl.src = thumb;
        artEl.style.display = 'block';
        if (phEl) phEl.style.display = 'none';
    } else if (artEl) {
        artEl.style.display = 'none';
        if (phEl) phEl.style.display = 'flex';
    }

    document.title = `${title} · GoSong`;

    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title, artist: channel,
            artwork: thumb ? [{ src: thumb, sizes: '480x360', type: 'image/jpeg' }] : [],
        });
        navigator.mediaSession.setActionHandler('play', () => ytPlayer?.playVideo());
        navigator.mediaSession.setActionHandler('pause', () => ytPlayer?.pauseVideo());
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            const next = ytState.resultIndex + 1;
            if (ytState.results[next]) ytPlayResult(next);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            const prev = ytState.resultIndex - 1;
            if (ytState.results[prev]) ytPlayResult(prev);
        });
    }
}

/* ── Parse YouTube URL or ID ────────────────────────────────────── */
function extractYTVideoId(input) {
    if (!input) return null;
    input = input.trim();
    const patterns = [
        /[?&]v=([a-zA-Z0-9_-]{11})/,
        /youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = input.match(p);
        if (m) return m[1];
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    return null;
}

/* ── YouTube Search via Data API v3 (Music only) ───────────────── */
async function ytSearch(query) {
    if (!YT_API_KEY) throw new Error('NO_KEY');
    const url = `https://www.googleapis.com/youtube/v3/search?` +
        new URLSearchParams({
            part: 'snippet',
            q: query + ' music',        // bias toward music results
            type: 'video',
            maxResults: 20,
            key: YT_API_KEY,
            videoCategoryId: '10',      // YouTube Music category
            topicId: '/m/04rlf',        // Music topic filter (double lock)
        });
    const res = await fetch(url);
    if (res.status === 403) throw new Error('QUOTA');
    if (!res.ok) throw new Error(`YT API error ${res.status}`);
    const data = await res.json();
    return (data.items || []).map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails?.medium?.url || '',
    }));
}

/* ── Play a search result by index ─────────────────────────────── */
function ytPlayResult(idx) {
    const r = ytState.results[idx];
    if (!r) return;
    ytState.resultIndex = idx;

    // TRANSITION: grid → player view
    const gridView = document.getElementById('ytGridView');
    const bodyPanel = document.getElementById('ytBodyPanel');
    const wrap = document.getElementById('ytPlayerWrap');
    const ph = document.getElementById('ytLeftPlaceholder');

    if (gridView) gridView.style.display = 'none';
    // Use flex on mobile (column), grid on desktop (side-by-side)
    if (bodyPanel) bodyPanel.style.display = window.innerWidth <= 768 ? 'flex' : 'grid';
    if (wrap) wrap.style.display = 'block';
    if (ph) ph.style.display = 'none';

    // On mobile, scroll to top so the video is visible
    if (window.innerWidth <= 768) {
        document.getElementById('ytMode')?.scrollTo({ top: 0, behavior: 'smooth' });
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }

    ytLoadVideo(r.videoId, r.title, r.channel, r.thumb);

    // Re-render sidebar list (horizontal cards) into ytResultsList
    ytRenderSidebar();

    // Highlight active card + scroll into view in sidebar
    document.querySelectorAll('#ytResultsList .yt-result-card').forEach((card, i) => {
        card.classList.toggle('active', i === idx);
        if (i === idx) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

/* ── Render results as GRID (search state) ──────────────────────── */
function ytRenderResults(results) {
    const label = document.getElementById('ytResultsLabel');
    if (label) label.textContent = `${results.length} results`;

    // Show grid view, hide player panel
    const gridView = document.getElementById('ytGridView');
    const bodyPanel = document.getElementById('ytBodyPanel');
    if (gridView) gridView.style.display = 'block';
    if (bodyPanel) bodyPanel.style.display = 'none';

    const grid = document.getElementById('ytResultsGrid');
    if (!grid) return;

    if (!results.length) {
        grid.innerHTML = `<div class="yt-no-results">No results found</div>`;
        return;
    }

    grid.innerHTML = results.map((r, i) => {
        const isLiked = typeof state !== 'undefined' && state.ytLikedMap?.has(r.videoId);
        return `<div class="yt-grid-card" data-idx="${i}">
       <div class="yt-thumb-wrap">
         <img src="${r.thumb || r.thumbnail || ''}" alt="" loading="lazy" onerror="this.style.opacity='0'">
         <span class="yt-play-overlay">▶</span>
         <button class="yt-card-like-btn ${isLiked ? 'liked' : ''}" data-idx="${i}" onclick="event.stopPropagation(); ytToggleLikeFromCard(${i}, this)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
         </button>
       </div>
       <div class="yt-grid-info">
         <span class="yt-result-title">${escYT(r.title)}</span>
         <span class="yt-result-channel">${escYT(r.channel)}</span>
       </div>
     </div>`;
    }).join('');

    grid.onclick = e => {
        const card = e.target.closest('.yt-grid-card');
        if (card) ytPlayResult(parseInt(card.dataset.idx, 10));
    };
}

/* ── Render results as sidebar LIST (player state) ──────────────── */
function ytRenderSidebar() {
    const list = document.getElementById('ytResultsList');
    if (!list || !ytState.results.length) return;

    list.innerHTML = ytState.results.map((r, i) => {
        const isLiked = typeof state !== 'undefined' && state.ytLikedMap?.has(r.videoId);
        return `<div class="yt-result-card${i === ytState.resultIndex ? ' active' : ''}" data-idx="${i}">
       <div class="yt-thumb-wrap">
         <img src="${r.thumb || r.thumbnail || ''}" alt="" loading="lazy" onerror="this.style.opacity='0'">
         <span class="yt-play-overlay">▶</span>
         <button class="yt-card-like-btn ${isLiked ? 'liked' : ''}" data-idx="${i}" onclick="event.stopPropagation(); ytToggleLikeFromCard(${i}, this)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
         </button>
       </div>
       <div class="yt-result-info">
         <span class="yt-result-title">${escYT(r.title)}</span>
         <span class="yt-result-channel">${escYT(r.channel)}</span>
       </div>
     </div>`;
    }).join('');

    list.onclick = e => {
        const card = e.target.closest('.yt-result-card');
        if (card) ytPlayResult(parseInt(card.dataset.idx, 10));
    };
}

function escYT(str = '') {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════════════════
   YOUTUBE SEARCH AUTOCOMPLETE
   Uses Google's own YouTube suggest endpoint (same as youtube.com)
   JSONP to bypass CORS — no API key needed.
   ══════════════════════════════════════════════════════════════════ */

let ytSuggestDebounce = null;
let ytSuggestActive = -1; // currently highlighted row index

const ytSuggestEl = document.getElementById('ytSuggestions');
const ytInputEl = document.getElementById('ytSearchInput');

/* ── Fetch suggestions via JSONP ─────────────────────────────────── */
function fetchYTSuggestions(query) {
    if (!query || query.length < 2) { hideSuggestions(); return; }

    const cbName = `_ytSuggest_${Date.now()}`;
    const script = document.createElement('script');

    window[cbName] = (data) => {
        delete window[cbName];
        script.remove();
        const suggestions = (data[1] || []).map(s => s[0]).slice(0, 10);
        renderSuggestions(suggestions, query);
    };

    script.src = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}&callback=${cbName}`;
    script.onerror = () => { delete window[cbName]; script.remove(); };
    document.head.appendChild(script);
}

/* ── Render dropdown ─────────────────────────────────────────────── */
function renderSuggestions(suggestions, query) {
    if (!suggestions.length) { hideSuggestions(); return; }

    ytSuggestActive = -1;

    ytSuggestEl.innerHTML = suggestions.map((s, i) => {
        // Bold the matched query portion
        const escaped = escYT(s);
        const boldQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const highlighted = escaped.replace(
            new RegExp(`^(${boldQuery})`, 'i'),
            '<span class="yt-suggest-match">$1</span>'
        );
        return `<div class="yt-suggest-item" data-idx="${i}" data-query="${escYT(s)}">
      <svg viewBox="0 0 24 24" class="yt-suggest-icon"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <span>${highlighted}</span>
    </div>`;
    }).join('');

    ytSuggestEl.style.display = 'block';

    ytSuggestEl.onclick = e => {
        const item = e.target.closest('.yt-suggest-item');
        if (!item) return;
        const q = item.dataset.query;
        ytInputEl.value = q;
        hideSuggestions();
        handleYTInput(); // trigger search
    };
}

function hideSuggestions() {
    ytSuggestEl.style.display = 'none';
    ytSuggestEl.innerHTML = '';
    ytSuggestActive = -1;
}

/* ── Keyboard navigation ─────────────────────────────────────────── */
ytInputEl.addEventListener('keydown', e => {
    const items = ytSuggestEl.querySelectorAll('.yt-suggest-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        ytSuggestActive = Math.min(ytSuggestActive + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('active', i === ytSuggestActive));
        if (items[ytSuggestActive]) ytInputEl.value = items[ytSuggestActive].dataset.query;
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        ytSuggestActive = Math.max(ytSuggestActive - 1, -1);
        items.forEach((el, i) => el.classList.toggle('active', i === ytSuggestActive));
        if (ytSuggestActive >= 0 && items[ytSuggestActive]) ytInputEl.value = items[ytSuggestActive].dataset.query;
    } else if (e.key === 'Escape') {
        hideSuggestions();
    }
    // Enter is handled in the existing keydown listener in app.js
});

/* ── Input debounce ──────────────────────────────────────────────── */
ytInputEl.addEventListener('input', () => {
    const val = ytInputEl.value.trim();
    clearTimeout(ytSuggestDebounce);

    // If it's a YouTube URL, skip suggestions
    if (typeof extractYTVideoId === 'function' && extractYTVideoId(val)) {
        hideSuggestions(); return;
    }

    ytSuggestDebounce = setTimeout(() => fetchYTSuggestions(val), 220);
});

/* ── Hide on outside click ───────────────────────────────────────── */
document.addEventListener('click', e => {
    if (!e.target.closest('#ytSuggestions') && !e.target.closest('#ytSearchInput')) {
        hideSuggestions();
    }
});

/* ── Hide on search button click ────────────────────────────────── */
document.getElementById('ytSearchBtn').addEventListener('click', hideSuggestions);
