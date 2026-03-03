/**
 * api.js — Jamendo API wrapper
 * Streams Creative Commons licensed music by genre.
 */

const JAMENDO_CLIENT_ID = 'a7f62d43';
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

/**
 * Fetch tracks by genre tag from Jamendo.
 * @param {string} genre   - Genre/tag string (e.g. 'rock', 'jazz')
 * @param {number} offset  - Pagination offset (default 0)
 * @param {number} limit   - Max tracks to fetch (max 200 per call)
 * @returns {Promise<Track[]>}
 */
async function fetchTracksByGenre(genre, offset = 0, limit = 200) {
    const params = new URLSearchParams({
        client_id: JAMENDO_CLIENT_ID,
        format: 'json',
        limit: String(limit),
        offset: String(offset),
        tags: genre,
        include: 'musicinfo',
        audioformat: 'mp31',       // 128 kbps MP3 — broadest CDN availability
        imagesize: '200',
        order: 'popularity_total',
    });

    const url = `${JAMENDO_BASE}/tracks/?${params}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Jamendo API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.headers && data.headers.status === 'failed') {
        throw new Error(`Jamendo error: ${data.headers.error_message}`);
    }

    // Only keep tracks that have a valid, non-empty stream URL
    return (data.results || [])
        .map(normalizeTrack)
        .filter(t => t.streamUrl && t.streamUrl.startsWith('http'));
}

/**
 * Normalize a raw Jamendo track object into our app's track shape.
 */
function normalizeTrack(raw) {
    return {
        id: String(raw.id),
        title: raw.name || 'Unknown Title',
        artist: raw.artist_name || 'Unknown Artist',
        album: raw.album_name || 'Single',
        albumArt: raw.album_image || raw.image || '',
        streamUrl: raw.audio || '',
        duration: parseInt(raw.duration) || 0,
        genre: raw.tags || [],
    };
}
