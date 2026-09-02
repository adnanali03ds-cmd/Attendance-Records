/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'teacher' | 'admin';
  department?: string;
  schoolRole?: 'Teacher' | 'Principal' | 'Coordinator' | 'Office Staff' | 'Other';
  schoolRoleOther?: string;
  subjects?: string[];
  classes?: string[];
  teachingAssignments?: TeachingAssignment[];
  profileCompleted?: boolean;
  createdAt: string;
}

export interface TeachingAssignment {
  subject: string;
  classes: string[];
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  timeIn: any; // Firestore Timestamp
  timeOut?: any; // Firestore Timestamp
  status: 'present' | 'late';
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
  };
}

export interface LeaveApplication {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  dates?: string[];
  totalDays?: number;
  reason: string;
  type: 'sick' | 'casual' | 'vacation';
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: any;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: any;
}
