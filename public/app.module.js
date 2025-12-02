// Modular version of app.js for testing
// This file exports all functions for unit testing

(function() {
  'use strict';

// ========== FINGERPRINTING MODULE ==========

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

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getUserFingerprint() {
  let fingerprint = localStorage.getItem('userFingerprint');
  if (!fingerprint) {
    fingerprint = await generateBrowserFingerprint();
    localStorage.setItem('userFingerprint', fingerprint);
  }
  return fingerprint;
}

// ========== TIME FORMATTING MODULE ==========

function formatElapsedTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes + ':' + String(secs).padStart(2, '0');
}

// ========== METADATA MODULE ==========

async function fetchMetadata(metadataUrl) {
  const response = await fetch(metadataUrl);
  const data = await response.json();
  return data;
}

function updateNowPlayingDisplay(data) {
  const year = data.date || '';
  const titleElement = document.getElementById('currentTitle');
  const artistElement = document.getElementById('currentArtist');
  const albumElement = document.getElementById('currentAlbum');

  if (titleElement) {
    titleElement.textContent = (data.title || 'Unknown Title') + (year ? ` (${year})` : '');
  }
  if (artistElement) {
    artistElement.textContent = data.artist || 'Unknown Artist';
  }
  if (albumElement) {
    albumElement.textContent = data.album || '';
  }
}

function updateQualityDisplay(data) {
  const sourceQuality = data.source_quality || '16-bit 44.1kHz';
  const streamQuality = data.stream_quality || '48kHz FLAC / HLS Lossless';

  const sourceElement = document.getElementById('sourceQuality');
  const streamElement = document.getElementById('streamQuality');

  if (sourceElement) {
    sourceElement.textContent = `Source quality: ${sourceQuality}`;
  }
  if (streamElement) {
    streamElement.textContent = `Stream quality: ${streamQuality}`;
  }
}

function updateAlbumArt(coverUrl) {
  const albumArt = document.getElementById('albumArt');
  if (albumArt) {
    albumArt.src = coverUrl + '?' + new Date().getTime();
  }
}

function updateRecentlyPlayed(data) {
  const trackListDiv = document.getElementById('trackList');
  if (!trackListDiv) return;

  trackListDiv.innerHTML = '';

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
}

// ========== RATING MODULE ==========

async function submitRating(artist, title, rating, userFingerprint) {
  const response = await fetch('/api/ratings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artist,
      title,
      rating,
      userFingerprint,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit rating');
  }

  return await response.json();
}

async function getRatingCounts(artist, title) {
  const response = await fetch(
    `/api/ratings/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  );
  return await response.json();
}

async function getUserRating(artist, title, userFingerprint) {
  const response = await fetch(
    `/api/ratings/${encodeURIComponent(artist)}/${encodeURIComponent(title)}/user/${userFingerprint}`
  );
  return await response.json();
}

function updateRatingDisplay(thumbsUp, thumbsDown) {
  const thumbsUpCount = document.getElementById('thumbsUpCount');
  const thumbsDownCount = document.getElementById('thumbsDownCount');

  if (thumbsUpCount) {
    thumbsUpCount.textContent = thumbsUp;
  }
  if (thumbsDownCount) {
    thumbsDownCount.textContent = thumbsDown;
  }
}

function updateRatingButtonStates(userRating) {
  const thumbsUpBtn = document.getElementById('thumbsUpBtn');
  const thumbsDownBtn = document.getElementById('thumbsDownBtn');

  if (!thumbsUpBtn || !thumbsDownBtn) return;

  // Reset button states
  thumbsUpBtn.classList.remove('active');
  thumbsDownBtn.classList.remove('active');
  thumbsUpBtn.disabled = false;
  thumbsDownBtn.disabled = false;

  // Highlight user's rating
  if (userRating && userRating.hasRated) {
    if (userRating.rating === 1) {
      thumbsUpBtn.classList.add('active');
    } else if (userRating.rating === -1) {
      thumbsDownBtn.classList.add('active');
    }
  }
}

// ========== ERROR HANDLING MODULE ==========

function showError(message) {
  const errorMessage = document.getElementById('errorMessage');
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
      errorMessage.classList.remove('show');
    }, 5000);
  }
}

// ========== AUDIO PLAYER MODULE ==========

function initializeHLS(streamUrl, audioElement) {
  if (!Hls || !Hls.isSupported()) {
    // Check for native HLS support (Safari)
    if (audioElement.canPlayType('application/vnd.apple.mpegurl')) {
      audioElement.src = streamUrl;
      return null;
    }
    throw new Error('HLS is not supported in your browser');
  }

  const hls = new Hls({
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 90,
  });

  hls.loadSource(streamUrl);
  hls.attachMedia(audioElement);

  return hls;
}

function setupPlayPauseButton(audioElement, playButton, playIcon) {
  let isPlaying = false;

  playButton.addEventListener('click', function () {
    if (isPlaying) {
      audioElement.pause();
      playIcon.textContent = '▶';
      isPlaying = false;
    } else {
      audioElement
        .play()
        .then(() => {
          playIcon.textContent = '⏸';
          isPlaying = true;
        })
        .catch((error) => {
          console.error('Playback error:', error);
          showError('Failed to start playback: ' + error.message);
        });
    }
  });

  return { getIsPlaying: () => isPlaying };
}

function setupVolumeControl(audioElement, volumeSlider) {
  // Initialize volume
  audioElement.volume = volumeSlider.value / 100;

  volumeSlider.addEventListener('input', function () {
    const volume = this.value / 100;
    audioElement.volume = volume;
  });
}

// ========== VALIDATION MODULE ==========

function validateRatingInput(artist, title, rating, userFingerprint) {
  if (!artist || !title) {
    return { valid: false, error: 'No song currently playing' };
  }
  if (rating !== 1 && rating !== -1) {
    return { valid: false, error: 'Rating must be 1 or -1' };
  }
  if (!userFingerprint) {
    return { valid: false, error: 'User fingerprint not available' };
  }
  return { valid: true };
}

// ========== EXPORTS ==========

// Export for both browser (ES modules/globals) and Node.js (CommonJS)
const RadioCalicoModule = {
  generateBrowserFingerprint,
  hashString,
  getUserFingerprint,
  formatElapsedTime,
  fetchMetadata,
  updateNowPlayingDisplay,
  updateQualityDisplay,
  updateAlbumArt,
  updateRecentlyPlayed,
  submitRating,
  getRatingCounts,
  getUserRating,
  updateRatingDisplay,
  updateRatingButtonStates,
  showError,
  initializeHLS,
  setupPlayPauseButton,
  setupVolumeControl,
  validateRatingInput,
};

// Export for Node.js testing (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RadioCalicoModule;
}

// Export for browser (global)
if (typeof window !== 'undefined') {
  window.RadioCalicoModule = RadioCalicoModule;
}

})(); // End IIFE
