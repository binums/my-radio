// Frontend test setup
const { TextEncoder, TextDecoder } = require('util');

// Add TextEncoder and TextDecoder to global
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock window.crypto for fingerprinting tests
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.subtle) {
  global.crypto.subtle = {};
}
global.crypto.subtle.digest = jest.fn().mockImplementation(() =>
  Promise.resolve(new ArrayBuffer(32))
);

// Mock HLS.js
global.Hls = class Hls {
  static isSupported() {
    return true;
  }

  constructor() {
    this.Events = {
      MANIFEST_PARSED: 'hlsManifestParsed',
      ERROR: 'hlsError',
    };
    this.ErrorTypes = {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
    };
  }

  loadSource() {}
  attachMedia() {}
  on() {}
  startLoad() {}
  recoverMediaError() {}
  destroy() {}
};

global.Hls.Events = {
  MANIFEST_PARSED: 'hlsManifestParsed',
  ERROR: 'hlsError',
};

global.Hls.ErrorTypes = {
  NETWORK_ERROR: 'networkError',
  MEDIA_ERROR: 'mediaError',
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock canvas methods for fingerprinting
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillText: jest.fn(),
  fillRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: [] })),
  canvas: {
    toDataURL: jest.fn(() => 'mock-canvas-data'),
  },
}));

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'mock-canvas-data');
