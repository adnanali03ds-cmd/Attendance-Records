export const ATTENDANCE_QR_CODE = 'TGA-SECURE-2026-X7';
export const ATTENDANCE_LOCATION_DOCUMENT = 'current';

export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface AttendanceCampus extends AttendanceLocation {
  id: string;
  name: string;
  enabled: boolean;
}

export interface AttendanceSettings extends Partial<AttendanceLocation> {
  campuses?: AttendanceCampus[];
}

export interface CampusMatch {
  campus: AttendanceCampus;
  distanceMeters: number;
}

export function getConfiguredCampuses(settings: AttendanceSettings | null): AttendanceCampus[] {
  if (!settings) return [];

  if (Array.isArray(settings.campuses)) {
    return settings.campuses.filter((campus) =>
      campus.enabled !== false
      && Number.isFinite(campus.latitude)
      && Number.isFinite(campus.longitude)
      && Number.isFinite(campus.radiusMeters)
    );
  }

  if (
    Number.isFinite(settings.latitude)
    && Number.isFinite(settings.longitude)
    && Number.isFinite(settings.radiusMeters)
  ) {
    return [{
      id: 'campus-a',
      name: 'Campus A',
      enabled: true,
      latitude: settings.latitude!,
      longitude: settings.longitude!,
      radiusMeters: settings.radiusMeters!,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    }];
  }

  return [];
}

export function findNearestCampus(
  currentLocation: Pick<AttendanceLocation, 'latitude' | 'longitude'>,
  campuses: AttendanceCampus[],
): CampusMatch | null {
  return campuses.reduce<CampusMatch | null>((nearest, campus) => {
    const distanceMeters = distanceInMeters(currentLocation, campus);
    if (!nearest || distanceMeters < nearest.distanceMeters) return { campus, distanceMeters };
    return nearest;
  }, null);
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
