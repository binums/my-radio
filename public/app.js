const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';
const audio = document.getElementById('audioPlayer');
const playButton = document.getElementById('playButton');
const playIcon = document.getElementById('playIcon');
const volumeSlider = document.getElementById('volumeSlider');
const errorMessage = document.getElementById('errorMessage');
const elapsedTimeDisplay = document.getElementById('elapsedTime');

let hls;
let isPlaying = false;
let elapsedSeconds = 0;
let elapsedInterval;
let metadataInterval;
let currentTrack = { artist: '', title: '' };
let userFingerprint = null;

// Generate browser fingerprint using multiple factors
async function generateBrowserFingerprint() {
    const components = [];

    // Screen resolution and color depth
    components.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language);

    // Platform
    components.push(navigator.platform);

    // Hardware concurrency (CPU cores)
    components.push(navigator.hardwareConcurrency || 'unknown');

    // Device memory (if available)
    components.push(navigator.deviceMemory || 'unknown');

    // User agent
    components.push(navigator.userAgent);

    // Canvas fingerprint
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        components.push(canvas.toDataURL().slice(-50));
    } catch (e) {
        components.push('canvas_error');
    }

    // WebGL fingerprint
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
            }
        }
    } catch (e) {
        components.push('webgl_error');
    }

    // Get IP address from server
    try {
        const ipResponse = await fetch('/api/client-ip');
        const ipData = await ipResponse.json();
        components.push(ipData.ip || 'no_ip');
    } catch (e) {
        components.push('ip_error');
    }

    // Create hash from all components
    const fingerprintString = components.join('|');
    const hash = await hashString(fingerprintString);

    return hash;
}

// Simple hash function
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get or generate user fingerprint
async function getUserFingerprint() {
    let fingerprint = localStorage.getItem('userFingerprint');
    if (!fingerprint) {
        fingerprint = await generateBrowserFingerprint();
        localStorage.setItem('userFingerprint', fingerprint);
    }
    return fingerprint;
}

// Initialize fingerprint (async)
getUserFingerprint().then(fp => {
    userFingerprint = fp;
    console.log('User fingerprint initialized');
});

// Initialize volume
audio.volume = volumeSlider.value / 100;

// Format elapsed time as M:SS
function formatElapsedTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes + ':' + String(secs).padStart(2, '0');
}

// Update elapsed time display
function updateElapsedTime() {
    elapsedSeconds++;
    elapsedTimeDisplay.textContent = formatElapsedTime(elapsedSeconds);
}

// Start elapsed time counter
function startElapsedTimer() {
    elapsedInterval = setInterval(updateElapsedTime, 1000);
}

// Stop elapsed time counter
function stopElapsedTimer() {
    if (elapsedInterval) {
        clearInterval(elapsedInterval);
    }
}

// Reset elapsed time
function resetElapsedTimer() {
    stopElapsedTimer();
    elapsedSeconds = 0;
    elapsedTimeDisplay.textContent = '0:00';
}

// Fetch and update metadata
async function fetchMetadata() {
    try {
        const response = await fetch(metadataUrl);
        const data = await response.json();

        // Update Now Playing
        const year = data.date || '';
        document.getElementById('currentTitle').textContent = (data.title || 'Unknown Title') + (year ? ` (${year})` : '');
        document.getElementById('currentArtist').textContent = data.artist || 'Unknown Artist';
        document.getElementById('currentAlbum').textContent = data.album || '';

        // Update quality information
        const sourceQuality = data.source_quality || '16-bit 44.1kHz';
        const streamQuality = data.stream_quality || '48kHz FLAC / HLS Lossless';
        document.getElementById('sourceQuality').textContent = `Source quality: ${sourceQuality}`;
        document.getElementById('streamQuality').textContent = `Stream quality: ${streamQuality}`;

        // Update album art with cache busting
        const albumArt = document.getElementById('albumArt');
        albumArt.src = 'https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg?' + new Date().getTime();

        // Check if track changed and update ratings
        if (currentTrack.artist !== data.artist || currentTrack.title !== data.title) {
            currentTrack = { artist: data.artist, title: data.title };
            await updateRatings();
        }

        // Update Recently Played
        const trackListDiv = document.getElementById('trackList');
        trackListDiv.innerHTML = '';

        // Build array of previous tracks
        for (let i = 1; i <= 5; i++) {
            const artist = data[`prev_artist_${i}`];
            const title = data[`prev_title_${i}`];

            if (artist && title) {
                const trackDiv = document.createElement('div');
                trackDiv.className = 'recent-track';
                trackDiv.innerHTML = `
                    <div class="recent-track-artist">${artist}:</div>
                    <div class="recent-track-title">${title}</div>
                `;
                trackListDiv.appendChild(trackDiv);
            }
        }
    } catch (error) {
        console.error('Error fetching metadata:', error);
        document.getElementById('currentTitle').textContent = 'Unable to load track info';
        document.getElementById('currentArtist').textContent = '';
    }
}

// Start metadata polling
function startMetadataPolling() {
    fetchMetadata(); // Fetch immediately
    metadataInterval = setInterval(fetchMetadata, 2000); // Poll every 2 seconds
}

// Stop metadata polling
function stopMetadataPolling() {
    if (metadataInterval) {
        clearInterval(metadataInterval);
    }
}

// Update ratings display
async function updateRatings() {
    try {
        if (!currentTrack.artist || !currentTrack.title) return;

        // Get rating counts
        const response = await fetch(`/api/ratings/${encodeURIComponent(currentTrack.artist)}/${encodeURIComponent(currentTrack.title)}`);
        const data = await response.json();

        document.getElementById('thumbsUpCount').textContent = data.thumbsUp;
        document.getElementById('thumbsDownCount').textContent = data.thumbsDown;

        // Check if user has already rated this song
        const userRatingResponse = await fetch(`/api/ratings/${encodeURIComponent(currentTrack.artist)}/${encodeURIComponent(currentTrack.title)}/user/${userFingerprint}`);
        const userRating = await userRatingResponse.json();

        const thumbsUpBtn = document.getElementById('thumbsUpBtn');
        const thumbsDownBtn = document.getElementById('thumbsDownBtn');

        // Reset button states
        thumbsUpBtn.classList.remove('active');
        thumbsDownBtn.classList.remove('active');
        thumbsUpBtn.disabled = false;
        thumbsDownBtn.disabled = false;

        // Highlight user's rating
        if (userRating.hasRated) {
            if (userRating.rating === 1) {
                thumbsUpBtn.classList.add('active');
            } else if (userRating.rating === -1) {
                thumbsDownBtn.classList.add('active');
            }
        }
    } catch (error) {
        console.error('Error updating ratings:', error);
    }
}

// Rate a song
async function rateSong(rating) {
    try {
        if (!currentTrack.artist || !currentTrack.title) {
            showError('No song currently playing');
            return;
        }

        const response = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                artist: currentTrack.artist,
                title: currentTrack.title,
                rating: rating,
                userFingerprint: userFingerprint
            })
        });

        if (response.ok) {
            await updateRatings();
        } else {
            const error = await response.json();
            showError('Failed to submit rating: ' + error.message);
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showError('Failed to submit rating');
    }
}

// Check if HLS is supported
if (Hls.isSupported()) {
    hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
    });

    hls.loadSource(streamUrl);
    hls.attachMedia(audio);

    hls.on(Hls.Events.MANIFEST_PARSED, function() {
        console.log('HLS manifest loaded');
    });

    hls.on(Hls.Events.ERROR, function(event, data) {
        console.error('HLS error:', data);
        if (data.fatal) {
            switch(data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    showError('Network error - trying to recover');
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                    showError('Media error - trying to recover');
                    hls.recoverMediaError();
                    break;
                default:
                    showError('Fatal error - cannot recover');
                    hls.destroy();
                    break;
            }
        }
    });
} else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari)
    audio.src = streamUrl;
} else {
    showError('HLS is not supported in your browser');
}

// Play/Pause button
playButton.addEventListener('click', function() {
    if (isPlaying) {
        audio.pause();
        playIcon.textContent = '▶';
        isPlaying = false;
        stopElapsedTimer();
    } else {
        audio.play().then(() => {
            playIcon.textContent = '⏸';
            isPlaying = true;
            startElapsedTimer();
        }).catch(error => {
            console.error('Playback error:', error);
            showError('Failed to start playback: ' + error.message);
        });
    }
});

// Volume control
volumeSlider.addEventListener('input', function() {
    const volume = this.value / 100;
    audio.volume = volume;
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

// Handle page visibility change (pause when tab is hidden)
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isPlaying) {
        // Keep playing even when tab is hidden (optional: comment out to pause)
        // audio.pause();
    }
});

// Initialize metadata polling on page load
startMetadataPolling();
