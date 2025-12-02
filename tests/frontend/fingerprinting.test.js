/**
 * @jest-environment jsdom
 */

const {
  generateBrowserFingerprint,
  hashString,
  getUserFingerprint,
} = require('../../public/app.module');

describe('User Fingerprinting Module', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hashString', () => {
    test('should generate consistent hash for same input', async () => {
      const input = 'test-string';

      // Mock crypto.subtle.digest to return consistent value
      const mockHash = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash.buffer);

      const hash1 = await hashString(input);
      const hash2 = await hashString(input);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBeGreaterThan(0);
    });

    test('should generate hex string output', async () => {
      const mockHash = new Uint8Array([255, 128, 64, 32]);
      global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash.buffer);

      const hash = await hashString('test');

      expect(hash).toMatch(/^[0-9a-f]+$/);
      expect(hash).toBe('ff804020');
    });
  });

  describe('generateBrowserFingerprint', () => {
    beforeEach(() => {
      // Mock screen properties
      global.screen = {
        width: 1920,
        height: 1080,
        colorDepth: 24,
      };

      // Mock navigator properties
      global.navigator = {
        language: 'en-US',
        platform: 'MacIntel',
        hardwareConcurrency: 8,
        deviceMemory: 8,
        userAgent: 'Mozilla/5.0 Test',
      };

      // Mock Intl
      global.Intl = {
        DateTimeFormat: function () {
          return {
            resolvedOptions: () => ({ timeZone: 'America/New_York' }),
          };
        },
      };

      // Mock fetch for IP
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ ip: '192.168.1.1' }),
      });

      // Mock canvas
      const mockCanvas = {
        getContext: jest.fn(() => ({
          fillText: jest.fn(),
          textBaseline: 'top',
          font: '14px Arial',
        })),
        toDataURL: jest.fn(() => 'data:image/png;base64,mockedcanvasdata'),
      };
      document.createElement = jest.fn((tag) => {
        if (tag === 'canvas') {
          return mockCanvas;
        }
        return {};
      });

      // Mock crypto
      const mockHash = new Uint8Array(32).fill(1);
      global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash.buffer);
    });

    test('should generate fingerprint with all components', async () => {
      const fingerprint = await generateBrowserFingerprint();

      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
      expect(global.fetch).toHaveBeenCalledWith('/api/client-ip');
    });

    test('should include screen resolution in fingerprint', async () => {
      await generateBrowserFingerprint();

      expect(global.crypto.subtle.digest).toHaveBeenCalled();
      const callArg = global.crypto.subtle.digest.mock.calls[0][1];
      const dataString = new TextDecoder().decode(callArg);
      expect(dataString).toContain('1920x1080x24');
    });

    test('should include timezone in fingerprint', async () => {
      await generateBrowserFingerprint();

      const callArg = global.crypto.subtle.digest.mock.calls[0][1];
      const dataString = new TextDecoder().decode(callArg);
      expect(dataString).toContain('America/New_York');
    });

    test('should handle IP fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const fingerprint = await generateBrowserFingerprint();

      expect(typeof fingerprint).toBe('string');
      const callArg = global.crypto.subtle.digest.mock.calls[0][1];
      const dataString = new TextDecoder().decode(callArg);
      expect(dataString).toContain('ip_error');
    });

    test('should handle canvas error gracefully', async () => {
      document.createElement = jest.fn((tag) => {
        if (tag === 'canvas') {
          return {
            getContext: jest.fn(() => {
              throw new Error('Canvas error');
            }),
          };
        }
        return {};
      });

      const fingerprint = await generateBrowserFingerprint();

      expect(typeof fingerprint).toBe('string');
      const callArg = global.crypto.subtle.digest.mock.calls[0][1];
      const dataString = new TextDecoder().decode(callArg);
      expect(dataString).toContain('canvas_error');
    });
  });

  describe('getUserFingerprint', () => {
    beforeEach(() => {
      // Setup for generateBrowserFingerprint
      global.screen = { width: 1920, height: 1080, colorDepth: 24 };
      global.navigator = {
        language: 'en-US',
        platform: 'MacIntel',
        hardwareConcurrency: 8,
        userAgent: 'Test',
      };
      global.Intl = {
        DateTimeFormat: function () {
          return {
            resolvedOptions: () => ({ timeZone: 'UTC' }),
          };
        },
      };
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ ip: '192.168.1.1' }),
      });
      const mockCanvas = {
        getContext: jest.fn(() => ({
          fillText: jest.fn(),
          textBaseline: 'top',
          font: '14px Arial',
        })),
        toDataURL: jest.fn(() => 'data:mock'),
      };
      document.createElement = jest.fn(() => mockCanvas);
      const mockHash = new Uint8Array(32).fill(1);
      // Ensure crypto.subtle exists before setting digest
      if (!global.crypto) {
        global.crypto = {};
      }
      if (!global.crypto.subtle) {
        global.crypto.subtle = {};
      }
      global.crypto.subtle.digest = jest.fn().mockResolvedValue(mockHash.buffer);
    });

    test('should generate and cache fingerprint in localStorage', async () => {
      const fingerprint = await getUserFingerprint();

      expect(typeof fingerprint).toBe('string');
      expect(localStorage.getItem('userFingerprint')).toBe(fingerprint);
    });

    test('should retrieve cached fingerprint from localStorage', async () => {
      const cachedFingerprint = 'cached-fingerprint-123';
      localStorage.setItem('userFingerprint', cachedFingerprint);

      const fingerprint = await getUserFingerprint();

      expect(fingerprint).toBe(cachedFingerprint);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('should generate new fingerprint if not cached', async () => {
      expect(localStorage.getItem('userFingerprint')).toBeNull();

      const fingerprint = await getUserFingerprint();

      expect(fingerprint).toBeDefined();
      expect(localStorage.getItem('userFingerprint')).toBe(fingerprint);
    });
  });
});
