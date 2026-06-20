/**
 * Global polyfills for Midnight SDK in browser
 *
 * Based on midnight-seabattle example
 * https://github.com/bricktowers/midnight-seabattle
 */

import { Buffer } from 'buffer';

// CRITICAL: Set up process FIRST before importing anything else
// Many polyfills (including util) expect process to exist
// @ts-expect-error - polyfill for third-party libraries
globalThis.process = {
  env: {
    NODE_ENV: import.meta.env.MODE || 'development',
  },
  browser: true,
  version: '',
  versions: {},
  platform: 'browser',
};

// Global polyfill
// @ts-expect-error - polyfill
globalThis.global = globalThis;

// Buffer polyfill for Midnight SDK
globalThis.Buffer = Buffer;

// Util polyfill - create a simple one with inspect.custom
// This is what object-inspect (used by Midnight SDK) needs
// @ts-expect-error - polyfill
globalThis.util = {
  inspect: {
    custom: Symbol.for('nodejs.util.inspect.custom'),
  },
};
