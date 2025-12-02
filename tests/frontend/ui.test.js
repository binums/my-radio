/**
 * @jest-environment jsdom
 */

const {
  showError,
  setupPlayPauseButton,
  setupVolumeControl,
} = require('../../public/app.module');

describe('UI Interaction Module', () => {
  describe('showError', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <div id="errorMessage" class="error-message"></div>
      `;
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should display error message', () => {
      showError('Test error message');

      const errorElement = document.getElementById('errorMessage');
      expect(errorElement.textContent).toBe('Test error message');
      expect(errorElement.classList.contains('show')).toBe(true);
    });

    test('should hide error message after 5 seconds', () => {
      showError('Test error');

      const errorElement = document.getElementById('errorMessage');
      expect(errorElement.classList.contains('show')).toBe(true);

      jest.advanceTimersByTime(5000);

      expect(errorElement.classList.contains('show')).toBe(false);
    });

    test('should handle missing error element gracefully', () => {
      document.body.innerHTML = '';

      expect(() => showError('Test error')).not.toThrow();
    });

    test('should update message on consecutive calls', () => {
      showError('First error');
      const errorElement = document.getElementById('errorMessage');
      expect(errorElement.textContent).toBe('First error');

      showError('Second error');
      expect(errorElement.textContent).toBe('Second error');
    });
  });

  describe('setupPlayPauseButton', () => {
    let audioElement;
    let playButton;
    let playIcon;

    beforeEach(() => {
      document.body.innerHTML = `
        <button id="playButton"></button>
        <span id="playIcon">▶</span>
        <audio id="audioPlayer"></audio>
      `;

      audioElement = document.getElementById('audioPlayer');
      playButton = document.getElementById('playButton');
      playIcon = document.getElementById('playIcon');

      audioElement.play = jest.fn().mockResolvedValue(undefined);
      audioElement.pause = jest.fn();
    });

    test('should set up play button that starts playback', async () => {
      const { getIsPlaying } = setupPlayPauseButton(audioElement, playButton, playIcon);

      expect(getIsPlaying()).toBe(false);

      playButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(audioElement.play).toHaveBeenCalled();
      expect(playIcon.textContent).toBe('⏸');
      expect(getIsPlaying()).toBe(true);
    });

    test('should pause playback when playing', async () => {
      const { getIsPlaying } = setupPlayPauseButton(audioElement, playButton, playIcon);

      // Start playing
      playButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(getIsPlaying()).toBe(true);

      // Pause
      playButton.click();

      expect(audioElement.pause).toHaveBeenCalled();
      expect(playIcon.textContent).toBe('▶');
      expect(getIsPlaying()).toBe(false);
    });

    test('should toggle between play and pause', async () => {
      setupPlayPauseButton(audioElement, playButton, playIcon);

      // First click: play
      playButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(playIcon.textContent).toBe('⏸');

      // Second click: pause
      playButton.click();
      expect(playIcon.textContent).toBe('▶');

      // Third click: play again
      playButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(playIcon.textContent).toBe('⏸');
    });

    test('should handle playback errors gracefully', async () => {
      audioElement.play = jest.fn().mockRejectedValue(new Error('Playback failed'));

      // Mock showError to verify it's called
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      setupPlayPauseButton(audioElement, playButton, playIcon);

      playButton.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleError).toHaveBeenCalledWith('Playback error:', expect.any(Error));
      expect(playIcon.textContent).toBe('▶'); // Should remain in paused state

      consoleError.mockRestore();
    });
  });

  describe('setupVolumeControl', () => {
    let audioElement;
    let volumeSlider;

    beforeEach(() => {
      document.body.innerHTML = `
        <audio id="audioPlayer"></audio>
        <input type="range" id="volumeSlider" min="0" max="100" value="70" />
      `;

      audioElement = document.getElementById('audioPlayer');
      volumeSlider = document.getElementById('volumeSlider');
    });

    test('should initialize audio volume from slider value', () => {
      volumeSlider.value = 70;

      setupVolumeControl(audioElement, volumeSlider);

      expect(audioElement.volume).toBe(0.7);
    });

    test('should update audio volume when slider changes', () => {
      setupVolumeControl(audioElement, volumeSlider);

      volumeSlider.value = 50;
      volumeSlider.dispatchEvent(new Event('input'));

      expect(audioElement.volume).toBe(0.5);
    });

    test('should handle volume at 0', () => {
      setupVolumeControl(audioElement, volumeSlider);

      volumeSlider.value = 0;
      volumeSlider.dispatchEvent(new Event('input'));

      expect(audioElement.volume).toBe(0);
    });

    test('should handle volume at 100', () => {
      setupVolumeControl(audioElement, volumeSlider);

      volumeSlider.value = 100;
      volumeSlider.dispatchEvent(new Event('input'));

      expect(audioElement.volume).toBe(1);
    });

    test('should handle multiple volume changes', () => {
      setupVolumeControl(audioElement, volumeSlider);

      volumeSlider.value = 30;
      volumeSlider.dispatchEvent(new Event('input'));
      expect(audioElement.volume).toBe(0.3);

      volumeSlider.value = 80;
      volumeSlider.dispatchEvent(new Event('input'));
      expect(audioElement.volume).toBe(0.8);

      volumeSlider.value = 0;
      volumeSlider.dispatchEvent(new Event('input'));
      expect(audioElement.volume).toBe(0);
    });
  });
});
