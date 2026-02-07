/**
 * Haversine distance between two lat/lng coordinates.
 * Returns distance in meters.
 */
export function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Convert a lat/lng offset from the player into local 3D coords (meters).
 * X = east, Z = north (Babylon uses Y-up so altitude = Y).
 */
export function geoToLocal(
  playerLat: number,
  playerLng: number,
  targetLat: number,
  targetLng: number,
  targetAltitude: number
): { x: number; y: number; z: number } {
  const R = 6371000;
  const dLat = toRad(targetLat - playerLat);
  const dLng = toRad(targetLng - playerLng);
  const z = dLat * R;
  const x = dLng * R * Math.cos(toRad(playerLat));
  return { x, y: targetAltitude, z };
}
