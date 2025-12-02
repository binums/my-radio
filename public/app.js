// Main application initialization
// This file uses functions from app.module.js - all logic is centralized there

// Check if module is loaded
if (!window.RadioCalicoModule) {
  console.error('FATAL: RadioCalicoModule not loaded. Check app.module.js for errors.');
  alert('Application failed to load. Check console for errors.');
}

// Import functions from the module (available after app.module.js loads)
const {
  getUserFingerprint,
  formatElapsedTime,
  fetchMetadata,
  updateNowPlayingDisplay,
  updateQualityDisplay,
  updateAlbumArt,
  updateRecentlyPlayed,
  getRatingCounts,
  getUserRating,
  updateRatingDisplay,
  updateRatingButtonStates,
  submitRating,
  showError,
  initializeHLS,
  setupVolumeControl,
  validateRatingInput,
} = window.RadioCalicoModule || {};

// Configuration
const streamUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8';
const metadataUrl = 'https://d3d4yli4hf5bmh.cloudfront.net/metadatav2.json';

// DOM elements
const audio = document.getElementById('audioPlayer');
const playButton = document.getElementById('playButton');
const playIcon = document.getElementById('playIcon');
const volumeSlider = document.getElementById('volumeSlider');
const elapsedTimeDisplay = document.getElementById('elapsedTime');

// Application state
let hls;
let elapsedSeconds = 0;
let elapsedInterval;
let metadataInterval;
let currentTrack = { artist: '', title: '' };
let userFingerprint = null;

// ========== TIME TRACKING ==========

function updateElapsedTime() {
  elapsedSeconds++;
  elapsedTimeDisplay.textContent = formatElapsedTime(elapsedSeconds);
}

function startElapsedTimer() {
  elapsedInterval = setInterval(updateElapsedTime, 1000);
}

function stopElapsedTimer() {
  if (elapsedInterval) {
    clearInterval(elapsedInterval);
  }
}

function resetElapsedTimer() {
  stopElapsedTimer();
  elapsedSeconds = 0;
  elapsedTimeDisplay.textContent = '0:00';
}

// ========== METADATA POLLING ==========

async function handleMetadataUpdate() {
  try {
    const data = await fetchMetadata(metadataUrl);

    // Update Now Playing
    updateNowPlayingDisplay(data);
    updateQualityDisplay(data);
    updateAlbumArt('https://d3d4yli4hf5bmh.cloudfront.net/cover.jpg');

    // Check if track changed and update ratings
    if (currentTrack.artist !== data.artist || currentTrack.title !== data.title) {
      currentTrack = { artist: data.artist, title: data.title };
      await updateRatings();
      resetElapsedTimer();
    }

    // Update Recently Played
    updateRecentlyPlayed(data);
  } catch (error) {
    console.error('Error fetching metadata:', error);
    document.getElementById('currentTitle').textContent = 'Unable to load track info';
    document.getElementById('currentArtist').textContent = '';
  }
}

function startMetadataPolling() {
  handleMetadataUpdate(); // Fetch immediately
  metadataInterval = setInterval(handleMetadataUpdate, 2000); // Poll every 2 seconds
}

function stopMetadataPolling() {
  if (metadataInterval) {
    clearInterval(metadataInterval);
  }
}

// ========== RATING SYSTEM ==========

async function updateRatings() {
  try {
    if (!currentTrack.artist || !currentTrack.title) return;

    // Get rating counts
    const data = await getRatingCounts(currentTrack.artist, currentTrack.title);
    updateRatingDisplay(data.thumbsUp, data.thumbsDown);

    // Check if user has already rated this song
    const userRating = await getUserRating(
      currentTrack.artist,
      currentTrack.title,
      userFingerprint
    );
    updateRatingButtonStates(userRating);
  } catch (error) {
    console.error('Error updating ratings:', error);
  }
}

async function rateSong(rating) {
  try {
    const validation = validateRatingInput(
      currentTrack.artist,
      currentTrack.title,
      rating,
      userFingerprint
    );

    if (!validation.valid) {
      showError(validation.error);
      return;
    }

    await submitRating(
      currentTrack.artist,
      currentTrack.title,
      rating,
      userFingerprint
    );

    await updateRatings();
  } catch (error) {
    console.error('Error submitting rating:', error);
    showError('Failed to submit rating');
  }
}

// Make rateSong available globally for onclick handlers
window.rateSong = rateSong;

// ========== AUDIO PLAYER INITIALIZATION ==========

function initializeAudioPlayer() {
  try {
    hls = initializeHLS(streamUrl, audio);

    if (hls) {
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        console.log('HLS manifest loaded');
      });

      hls.on(Hls.Events.ERROR, function (event, data) {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
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
    }
  } catch (error) {
    console.error('Error initializing audio:', error);
    showError(error.message);
  }
}

// ========== UI SETUP ==========

function initializeUI() {
  // Setup play/pause button with custom callback for elapsed timer
  playButton.addEventListener('click', function () {
    if (!audio.paused) {
      // Currently playing, so pause it
      audio.pause();
      playIcon.textContent = '▶';
      stopElapsedTimer();
    } else {
      // Currently paused, so play it
      audio
        .play()
        .then(() => {
          playIcon.textContent = '⏸';
          startElapsedTimer();
        })
        .catch((error) => {
          console.error('Playback error:', error);
          showError('Failed to start playback: ' + error.message);
        });
    }
  });

  // Setup volume control
  setupVolumeControl(audio, volumeSlider);
}

// ========== PAGE VISIBILITY ==========

document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    // Keep playing even when tab is hidden (optional: pause here if desired)
  }
});

// ========== INITIALIZATION ==========

async function initialize() {
  // Initialize fingerprint
  userFingerprint = await getUserFingerprint();
  console.log('User fingerprint initialized');

  // Initialize audio player
  initializeAudioPlayer();

  // Initialize UI controls
  initializeUI();

  // Start metadata polling
  startMetadataPolling();
}

// Start the application
initialize();
