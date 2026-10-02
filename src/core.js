/**
 * Great-circle distance between two points on a sphere approximating Earth.
 *
 * The haversine formula is numerically well-behaved for small distances
 * because it avoids the arccos-of-near-1 singularity that the spherical law
 * of cosines hits when two points are close together. The cost is one extra
 * sqrt and a couple of multiplications; for a pure distance function that
 * trade is worth it.
 *
 * We deliberately use the mean Earth radius as a single constant rather than
 * letting the caller pick WGS-84 semi-axes. Haversine is a spherical model;
 * the ellipsoidal correction is well under 0.5% everywhere on Earth, and
 * pretending otherwise by accepting an `ellipsoid` parameter would imply a
 * precision the formula cannot deliver. If you need Vincenty, use Vincenty.
 */

/**
 * Mean Earth radius in metres. 6371008.8 is the IUGG R_1 value; it is the
 * radius of a sphere with the same volume as the reference ellipsoid. Any
 * value in [6371000, 6371015] is defensible; we pick one and stick to it so
 * the output is reproducible.
 */
export const EARTH_RADIUS_METRES = 6371008.8;

/**
 * Normalise a longitude in degrees to [-180, 180). The haversine formula is
 * invariant under rotation, so this is not strictly necessary, but callers
 * sometimes pass [0, 360) and then compare to results from another library —
 * normalising here makes surprises show up in the right place.
 */
export function normaliseLongitude(degrees) {
  let x = ((degrees + 180) % 360 + 360) % 360 - 180;
  if (x === 180) x = -180;
  return x;
}

/**
 * Clamp a latitude in degrees to [-90, 90]. A latitude outside this range is
 * a caller bug; we clamp rather than throw so that a stray sign flip or a
 * radians/mixup does not produce NaN silently in the middle of a pipeline.
 */
export function clampLatitude(degrees) {
  if (degrees < -90) return -90;
  if (degrees > 90) return 90;
  return degrees;
}

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two latitude/longitude points, in metres.
 *
 * @param {{lat: number, lon: number}} a - First point, decimal degrees.
 * @param {{lat: number, lon: number}} b - Second point, decimal degrees.
 * @returns {number} Great-circle distance in metres, always non-negative.
 */
export function haversineMetres(a, b) {
  if (
    typeof a?.lat !== 'number' ||
    typeof a?.lon !== 'number' ||
    typeof b?.lat !== 'number' ||
    typeof b?.lon !== 'number' ||
    Number.isNaN(a.lat) ||
    Number.isNaN(a.lon) ||
    Number.isNaN(b.lat) ||
    Number.isNaN(b.lon)
  ) {
    return NaN;
  }

  const lat1 = toRad(clampLatitude(a.lat));
  const lat2 = toRad(clampLatitude(b.lat));
  const dLat = toRad(clampLatitude(b.lat) - clampLatitude(a.lat));
  const dLon = toRad(normaliseLongitude(b.lon) - normaliseLongitude(a.lon));

  const sinDLatHalf = Math.sin(dLat / 2);
  const sinDLonHalf = Math.sin(dLon / 2);
  const h =
    sinDLatHalf * sinDLatHalf +
    Math.cos(lat1) * Math.cos(lat2) * sinDLonHalf * sinDLonHalf;

  // h can creep above 1 due to floating-point error when the two points are
  // nearly identical; clamp before asin to avoid NaN.
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_METRES * c;
}
