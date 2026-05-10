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
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  timeIn: any; // Firestore Timestamp
  timeOut?: any; // Firestore Timestamp
  status: 'present' | 'late';
}

export interface LeaveApplication {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
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
