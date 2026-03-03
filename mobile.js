/**
 * mobile.js — GoSong Mobile UI Controller
 * Handles: sidebar drawer, mini-player, full overlay, Media Session API
 * NOTE: Intentionally avoids re-declaring consts already in app.js.
 */

/* ── Detect mobile ──────────────────────────────────────── */
const IS_MOBILE = () => window.innerWidth <= 768;

/* ── DOM refs (only those NOT already declared in app.js) ── */
const mSidebar = document.getElementById('sidebar');
const mSidebarBackdrop = document.getElementById('sidebarBackdrop');
const mMenuBtn = document.getElementById('mobileMenuBtn');
const mMiniPlayer = document.getElementById('mobileMiniPlayer');
const mMiniArt = document.getElementById('miniArt');
const mMiniArtPH = document.getElementById('miniArtPlaceholder');
const mMiniTitle = document.getElementById('miniTitle');
const mMiniArtist = document.getElementById('miniArtist');
const mMiniPlay = document.getElementById('miniPlayPauseBtn');
const mMiniPlayIcon = document.getElementById('miniPlayIcon');
const mMiniNext = document.getElementById('miniNextBtn');
const mMiniFill = document.getElementById('miniProgressFill');

const mOverlay = document.getElementById('mobilePlayerOverlay');
const mCloseBtn = document.getElementById('overlayCloseBtn');
const mLikeBtn = document.getElementById('overlayLikeBtn');
const mHeartIcon = document.getElementById('overlayHeartIcon');
const mSourceLabel = document.getElementById('overlaySourceLabel');
const mOArt = document.getElementById('overlayArt');
const mOArtPH = document.getElementById('overlayArtPlaceholder');
const mOTitle = document.getElementById('overlayTitle');
const mOArtist = document.getElementById('overlayArtist');
const mOProgress = document.getElementById('overlayProgressTrack');
const mOFill = document.getElementById('overlayProgressFill');
const mOCurTime = document.getElementById('overlayCurrentTime');
const mOTotTime = document.getElementById('overlayTotalTime');
const mOPlay = document.getElementById('overlayPlayPauseBtn');
const mOPlayIcon = document.getElementById('overlayPlayIcon');
const mOPrev = document.getElementById('overlayPrevBtn');
const mONext = document.getElementById('overlayNextBtn');
const mOShuffle = document.getElementById('overlayShuffleBtn');
const mORepeat = document.getElementById('overlayRepeatBtn');
const mORepeatIcon = document.getElementById('overlayRepeatIcon');
const mOVolTrack = document.getElementById('overlayVolumeTrack');
const mOVolFill = document.getElementById('overlayVolumeFill');

/* ── State ──────────────────────────────────────────────── */
let mOverlayOpen = false;

/* ── Util ───────────────────────────────────────────────── */
function mFmt(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/* ── Sidebar drawer ─────────────────────────────────────── */
function mOpenSidebar() {
    mSidebar?.classList.add('mobile-open');
    mSidebarBackdrop?.classList.add('visible');
    document.body.classList.add('sidebar-active');
}
function mCloseSidebar() {
    mSidebar?.classList.remove('mobile-open');
    mSidebarBackdrop?.classList.remove('visible');
    document.body.classList.remove('sidebar-active');
}

mMenuBtn?.addEventListener('click', e => { e.stopPropagation(); mOpenSidebar(); });
mSidebarBackdrop?.addEventListener('click', mCloseSidebar);

/* Close sidebar when a genre/library item is tapped on mobile */
mSidebar?.addEventListener('click', e => {
    if (IS_MOBILE() && e.target.closest('.genre-item')) {
        setTimeout(mCloseSidebar, 200);
    }
});

/* ── Mini Player show/hide ──────────────────────────────── */
function mShowMini() {
    if (!IS_MOBILE() || !mMiniPlayer) return;
    mMiniPlayer.style.display = 'flex';
}

/* Tap on mini player → expand overlay */
mMiniPlayer?.addEventListener('click', e => {
    if (e.target.closest('.mini-ctrl-btn')) return;
    mOpenOverlay();
});

mMiniPlay?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('playPauseBtn')?.click();
});
mMiniNext?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('nextBtn')?.click();
});

/* ── Overlay ────────────────────────────────────────────── */
function mOpenOverlay() {
    mOverlay?.classList.add('open');
    mOverlayOpen = true;
    document.body.classList.add('overlay-open');
    lucide.createIcons();
}
function mCloseOverlay() {
    mOverlay?.classList.remove('open');
    mOverlayOpen = false;
    document.body.classList.remove('overlay-open');
}

mCloseBtn?.addEventListener('click', mCloseOverlay);

/* Swipe down to close */
let mTouchY = 0;
mOverlay?.addEventListener('touchstart', e => { mTouchY = e.touches[0].clientY; }, { passive: true });
mOverlay?.addEventListener('touchend', e => {
    if (e.changedTouches[0].clientY - mTouchY > 70) mCloseOverlay();
}, { passive: true });

/* ── Overlay control delegates → main player ────────────── */
mOPlay?.addEventListener('click', () => document.getElementById('playPauseBtn')?.click());
mOPrev?.addEventListener('click', () => document.getElementById('prevBtn')?.click());
mONext?.addEventListener('click', () => document.getElementById('nextBtn')?.click());
mOShuffle?.addEventListener('click', () => { document.getElementById('shuffleBtn')?.click(); mSyncState(); });
mORepeat?.addEventListener('click', () => { document.getElementById('repeatBtn')?.click(); mSyncState(); });
mLikeBtn?.addEventListener('click', () => { document.getElementById('likeBtn')?.click(); setTimeout(mSyncState, 80); });

/* Overlay progress seek */
mOProgress?.addEventListener('click', e => {
    const rect = mOProgress.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (typeof appMode !== 'undefined' && appMode === 'video') {
        if (typeof ytPlayer !== 'undefined' && ytPlayer?.getDuration) {
            const dur = ytPlayer.getDuration();
            if (dur) ytPlayer.seekTo(pct * dur, true);
        }
    } else {
        const audioEl = document.getElementById('audioPlayer');
        if (audioEl && audioEl.duration) audioEl.currentTime = pct * audioEl.duration;
    }
});

/* Overlay volume */
mOVolTrack?.addEventListener('click', e => {
    const rect = mOVolTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    if (mOVolFill) mOVolFill.style.width = `${pct * 100}%`;

    if (typeof state !== 'undefined') {
        state.volume = pct;
        localStorage.setItem('melodia_volume', pct);
    }

    const audioEl = document.getElementById('audioPlayer');
    if (audioEl) audioEl.volume = pct;

    if (typeof ytPlayer !== 'undefined' && ytPlayer?.setVolume) {
        ytPlayer.setVolume(pct * 100);
    }
});

/* ── Update mini + overlay UI ───────────────────────────── */
function mUpdateUI({ title, artist, art, isYT }) {
    if (!IS_MOBILE()) return;
    const t = title || 'No track selected';
    const a = artist || '—';

    if (mMiniTitle) mMiniTitle.textContent = t;
    if (mMiniArtist) mMiniArtist.textContent = a;
    if (mOTitle) mOTitle.textContent = t;
    if (mOArtist) mOArtist.textContent = a;
    if (mSourceLabel) mSourceLabel.textContent = isYT ? 'YouTube · Now Playing' : 'Jamendo · Now Playing';

    const hasArt = !!art && !art.endsWith('/');
    [mMiniArt, mOArt].forEach(img => { if (img) { img.src = art || ''; img.style.display = hasArt ? 'block' : 'none'; } });
    [mMiniArtPH, mOArtPH].forEach(ph => { if (ph) ph.style.display = hasArt ? 'none' : 'flex'; });

    mShowMini();
}

function mSyncPlayIcon(playing) {
    const playPath = 'M5 3l14 9-14 9V3z';
    const pausePath = 'M6 4h4v16H6zM14 4h4v16h-4z';
    const d = playing ? pausePath : playPath;
    if (mMiniPlayIcon) mMiniPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="${d}"/></svg>`;
    if (mOPlayIcon) mOPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="${d}"/></svg>`;
}

function mSyncState() {
    const shuffleActive = document.getElementById('shuffleBtn')?.classList.contains('active');
    const repeatActive = document.getElementById('repeatBtn')?.classList.contains('active');
    const likeActive = document.getElementById('likeBtn')?.classList.contains('liked');
    mOShuffle?.classList.toggle('active', !!shuffleActive);
    mORepeat?.classList.toggle('active', !!repeatActive);
    mLikeBtn?.classList.toggle('liked', !!likeActive);
    if (mHeartIcon) mHeartIcon.setAttribute('fill', likeActive ? 'currentColor' : 'none');
    const audioEl = document.getElementById('audioPlayer');
    if (audioEl && mOVolFill) mOVolFill.style.width = `${audioEl.volume * 100}%`;
}

/* ── Audio element event hooks ──────────────────────────── */
const mAudio = document.getElementById('audioPlayer');
if (mAudio) {
    mAudio.addEventListener('timeupdate', () => {
        if (!IS_MOBILE()) return;
        const pct = mAudio.duration ? (mAudio.currentTime / mAudio.duration) * 100 : 0;
        if (mMiniFill) mMiniFill.style.width = `${pct}%`;
        if (mOFill) mOFill.style.width = `${pct}%`;
        if (mOCurTime) mOCurTime.textContent = mFmt(mAudio.currentTime);
        if (mOTotTime) mOTotTime.textContent = mFmt(mAudio.duration);
    });
    mAudio.addEventListener('play', () => { mSyncPlayIcon(true); mSyncState(); });
    mAudio.addEventListener('pause', () => { mSyncPlayIcon(false); });
}

/* ── MutationObserver: watch playerTitle for changes ───── */
const mTitleObserver = new MutationObserver(() => {
    const title = document.getElementById('playerTitle')?.textContent;
    const artist = document.getElementById('playerArtist')?.textContent;
    const art = document.getElementById('playerAlbumArt')?.src || '';
    const isYT = typeof ytState !== 'undefined' && !!ytState.currentVideoId;
    mUpdateUI({ title, artist, art, isYT });
    mSyncState();
});
const mTitleEl = document.getElementById('playerTitle');
if (mTitleEl) mTitleObserver.observe(mTitleEl, { childList: true, subtree: true, characterData: true });

/* ── Media Session API (lock-screen + background) ────────── */
function mSetupMediaSession(title, artist, artwork) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'GoSong', artist: artist || '',
        artwork: artwork ? [{ src: artwork, sizes: '512x512', type: 'image/jpeg' }] : []
    });
    navigator.mediaSession.setActionHandler('play', () => document.getElementById('playPauseBtn')?.click());
    navigator.mediaSession.setActionHandler('pause', () => document.getElementById('playPauseBtn')?.click());
    navigator.mediaSession.setActionHandler('previoustrack', () => document.getElementById('prevBtn')?.click());
    navigator.mediaSession.setActionHandler('nexttrack', () => document.getElementById('nextBtn')?.click());
    navigator.mediaSession.setActionHandler('seekto', d => {
        if (d.seekTime == null) return;
        if (typeof appMode !== 'undefined' && appMode === 'video' && typeof ytPlayer !== 'undefined' && ytPlayer?.seekTo) {
            ytPlayer.seekTo(d.seekTime, true);
        } else if (mAudio) {
            mAudio.currentTime = d.seekTime;
        }
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => {
        if (typeof appMode !== 'undefined' && appMode === 'video' && typeof ytPlayer !== 'undefined' && ytPlayer?.getCurrentTime) {
            ytPlayer.seekTo(ytPlayer.getCurrentTime() - 10, true);
        } else if (mAudio) {
            mAudio.currentTime -= 10;
        }
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
        if (typeof appMode !== 'undefined' && appMode === 'video' && typeof ytPlayer !== 'undefined' && ytPlayer?.getCurrentTime) {
            ytPlayer.seekTo(ytPlayer.getCurrentTime() + 10, true);
        } else if (mAudio) {
            mAudio.currentTime += 10;
        }
    });
}

mAudio?.addEventListener('play', () => {
    const t = document.getElementById('playerTitle')?.textContent;
    const a = document.getElementById('playerArtist')?.textContent;
    const img = document.getElementById('playerAlbumArt')?.src;
    mSetupMediaSession(t, a, img);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
});
mAudio?.addEventListener('pause', () => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
});

/* YT media session update */
const mYTObserver = new MutationObserver(() => {
    if (typeof ytState === 'undefined' || !ytState.currentVideoId) return;
    const t = document.getElementById('playerTitle')?.textContent;
    const a = document.getElementById('playerArtist')?.textContent;
    mSetupMediaSession(t, a, ytState.currentThumb || '');
    mSyncPlayIcon(true);
    mSyncState();
});
if (mTitleEl) mYTObserver.observe(mTitleEl, { childList: true, subtree: true, characterData: true });

/* ── Service Worker ─────────────────────────────────────── */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js')
        .then(r => console.log('[GoSong SW] scope:', r.scope))
        .catch(e => console.warn('[GoSong SW] failed:', e));
}

/* ── Resize: reset mobile state on desktop ──────────────── */
window.addEventListener('resize', () => {
    if (!IS_MOBILE()) { mCloseSidebar(); if (mOverlayOpen) mCloseOverlay(); }
});

console.log('[mobile.js] loaded');
