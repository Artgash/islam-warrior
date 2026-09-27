/**
 * jsdom setup for the render smoke tests.
 *
 * jsdom implements neither media playback nor the layout APIs Framer Motion
 * and Radix reach for. None of these gaps represent application bugs - the
 * real browser provides all of them - so they are stubbed here rather than
 * being allowed to pollute the console and mask genuine React errors.
 */

import { beforeAll } from 'vitest';

beforeAll(() => {
  // This file also loads for the node-environment suites (the pure game
  // logic), where there is no DOM to patch. Nothing to do there.
  if (typeof window === 'undefined') return;

  // jsdom throws "Not implemented: HTMLMediaElement.prototype.play".
  // The app already guards the call; this keeps the console clean.
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: () => Promise.resolve(),
  });

  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: () => undefined,
  });

  Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: () => undefined,
  });

  // Radix and Framer Motion probe these.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof window.ResizeObserver;
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof window.IntersectionObserver;
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }

  if (!window.navigator.vibrate) {
    Object.defineProperty(window.navigator, 'vibrate', {
      configurable: true,
      value: () => true,
    });
  }
});
