export const ATTENDANCE_QR_CODE = 'TGA-SECURE-2026-X7';
export const ATTENDANCE_LOCATION_DOCUMENT = 'current';

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export function distanceInMeters(
  from: Pick<AttendanceLocation, 'latitude' | 'longitude'>,
  to: Pick<AttendanceLocation, 'latitude' | 'longitude'>,
) {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude))
    * Math.sin(longitudeDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
