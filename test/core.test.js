import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineMetres,
  EARTH_RADIUS_METRES,
  normaliseLongitude,
  clampLatitude,
} from '../src/core.js';

// Two floats are "close" if their absolute difference is below this. We
// always compare with a tolerance, never with === — see the project rules.
const close = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

test('zero distance for the same point', () => {
  const p = { lat: 51.5074, lon: -0.1278 };
  assert.equal(haversineMetres(p, p), 0);
});

test('London to Paris is roughly 343 km', () => {
  const london = { lat: 51.5074, lon: -0.1278 };
  const paris = { lat: 48.8566, lon: 2.3522 };
  const d = haversineMetres(london, paris);
  // The canonical great-circle distance is ~343,xxx m depending on the Earth
  // radius chosen; we accept anything within 5 km of that band.
  assert.ok(d > 340_000 && d < 346_000, `got ${d}`);
});

test('distance is symmetric regardless of argument order', () => {
  const a = { lat: 40.7128, lon: -74.006 };
  const b = { lat: 34.0522, lon: -118.2437 };
  assert.ok(close(haversineMetres(a, b), haversineMetres(b, a)));
});

test('antipodal points are close to half the Earth circumference', () => {
  const a = { lat: 0, lon: 0 };
  const b = { lat: 0, lon: 180 };
  const d = haversineMetres(a, b);
  const expected = Math.PI * EARTH_RADIUS_METRES;
  assert.ok(close(d, expected, 1));
});

test('longitude wrapping: 180 and -180 are the same point', () => {
  const a = { lat: 10, lon: 180 };
  const b = { lat: 10, lon: -180 };
  assert.equal(haversineMetres(a, b), 0);
});

test('longitude over 360 is wrapped to the canonical range', () => {
  const a = { lat: 5, lon: 370 };
  const b = { lat: 5, lon: 10 };
  assert.ok(close(haversineMetres(a, b), 0, 1e-6));
});

test('latitude above 90 is clamped, not treated as invalid', () => {
  const a = { lat: 100, lon: 0 };
  const b = { lat: 80, lon: 0 };
  // 100 clamps to 90, so this is the pole-to-80N meridian distance.
  const d = haversineMetres(a, b);
  const expected = (10 * Math.PI / 180) * EARTH_RADIUS_METRES;
  assert.ok(close(d, expected, 1));
});

test('NaN input yields NaN output, not a thrown error', () => {
  const good = { lat: 0, lon: 0 };
  const badLat = { lat: NaN, lon: 0 };
  const badLon = { lat: 0, lon: NaN };
  assert.ok(Number.isNaN(haversineMetres(good, badLat)));
  assert.ok(Number.isNaN(haversineMetres(good, badLon)));
});

test('missing property yields NaN output', () => {
  const good = { lat: 0, lon: 0 };
  // We intentionally construct an object without the lat/lon keys.
  const noLat = { lon: 0 };
  const noLon = { lat: 0 };
  assert.ok(Number.isNaN(haversineMetres(good, noLat)));
  assert.ok(Number.isNaN(haversineMetres(good, noLon)));
});

test('result is non-negative for any inputs', () => {
  const cases = [
    [{ lat: 0, lon: 0 }, { lat: 0, lon: 0 }],
    [{ lat: 90, lon: 0 }, { lat: -90, lon: 0 }],
    [{ lat: 45, lon: 90 }, { lat: -45, lon: -90 }],
  ];
  for (const [a, b] of cases) {
    const d = haversineMetres(a, b);
    assert.ok(d >= 0, `got negative distance ${d}`);
  }
});

test('normaliseLongitude maps into [-180, 180)', () => {
  assert.equal(normaliseLongitude(0), 0);
  assert.ok(close(normaliseLongitude(360), 0));
  assert.ok(close(normaliseLongitude(180), -180));
  assert.ok(close(normaliseLongitude(-180), -180));
  assert.ok(close(normaliseLongitude(540), -180));
  assert.ok(close(normaliseLongitude(-270), 90));
});

test('clampLatitude hard-bounds to [-90, 90]', () => {
  assert.equal(clampLatitude(0), 0);
  assert.equal(clampLatitude(90), 90);
  assert.equal(clampLatitude(-90), -90);
  assert.equal(clampLatitude(1000), 90);
  assert.equal(clampLatitude(-1000), -90);
});
