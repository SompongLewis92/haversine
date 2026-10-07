# Haversine

Great-circle distance in metres between two latitude/longitude points, using a
spherical Earth model.

```js
import { haversineMetres } from './src/index.js';

const london = { lat: 51.5074, lon: -0.1278 };
const paris  = { lat: 48.8566, lon: 2.3522  };
console.log(haversineMetres(london, paris)); // ~343000 (m)
```

## Why

Needed a distance function with no dependencies and a small enough surface to
read in one sitting. The haversine formula is chosen over the spherical law of
cosines because it stays numerically stable for short distances, where the
law of cosines evaluates arccos of a number indistinguishable from 1 and loses
most of its digits. The trade-off is that this is a spherical model: it uses a
single mean Earth radius (6371008.8 m) and does not model the WGS-84
ellipsoid. In practice that caps accuracy at roughly 0.5% worldwide, which is
fine for sorting, clustering, and radius queries, and not fine for surveying.

## Edges

- Longitudes are normalised to [-180, 180) internally, so `{ lon: 370 }` and
  `{ lon: 10 }` are the same point. This is not optional in the API; it just
  happens.
- Latitudes outside [-90, 90] are clamped, not rejected. A latitude of 100 is
  treated as 90 (the North Pole). If you pass garbage, you get a pole.
- A `NaN` coordinate or a missing `lat`/`lon` field produces `NaN`, not a
  thrown exception. Filter your inputs upstream if you need hard failures.

## Exports

- `haversineMetres(a, b)` — distance in metres between `{lat, lon}` points.
- `EARTH_RADIUS_METRES` — the radius constant used (6371008.8).
- `normaliseLongitude(degrees)` — maps any longitude to [-180, 180).
- `clampLatitude(degrees)` — clamps to [-90, 90].

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

