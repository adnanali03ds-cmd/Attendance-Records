import { eachDayOfInterval, format, isAfter, isBefore, isValid, startOfDay } from 'date-fns';
import { AttendanceRecord, LeaveApplication } from '../types';

export type AttendanceDayStatus = 'present' | 'absent' | 'leave' | 'neutral';

export interface AttendanceDayInfo {
  date: Date;
  dateKey: string;
  status: AttendanceDayStatus;
  attendance?: AttendanceRecord;
  leave?: LeaveApplication;
}

export interface AttendanceYearModel {
  days: Map<string, AttendanceDayInfo>;
  summary: {
    present: number;
    absent: number;
    leave: number;
    workingDays: number;
  };
}

function leaveDates(leave: LeaveApplication) {
  if (leave.dates?.length) return leave.dates;
  if (!leave.startDate || !leave.endDate || leave.endDate < leave.startDate) return [];
  return eachDayOfInterval({
    start: new Date(`${leave.startDate}T00:00:00`),
    end: new Date(`${leave.endDate}T00:00:00`),
  }).map((date) => format(date, 'yyyy-MM-dd'));
}

export function buildAttendanceYear(
  attendance: AttendanceRecord[],
  leaves: LeaveApplication[],
  year: number,
  joinedAt?: string,
): AttendanceYearModel {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const today = startOfDay(new Date());
  const joinedDateCandidate = joinedAt ? startOfDay(new Date(joinedAt)) : yearStart;
  const joinedDate = isValid(joinedDateCandidate) && isAfter(joinedDateCandidate, yearStart)
    ? joinedDateCandidate
    : yearStart;

  const attendanceByDate = new Map<string, AttendanceRecord>();
  attendance.forEach((record) => {
    if (record.date?.startsWith(`${year}-`) && !attendanceByDate.has(record.date)) {
      attendanceByDate.set(record.date, record);
    }
  });

  const approvedLeaveByDate = new Map<string, LeaveApplication>();
  leaves.filter((leave) => leave.status === 'approved').forEach((leave) => {
    leaveDates(leave).forEach((date) => {
      if (date.startsWith(`${year}-`)) approvedLeaveByDate.set(date, leave);
    });
  });

  const days = new Map<string, AttendanceDayInfo>();
  const summary = { present: 0, absent: 0, leave: 0, workingDays: 0 };

  eachDayOfInterval({ start: yearStart, end: yearEnd }).forEach((date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const record = attendanceByDate.get(dateKey);
    const leave = approvedLeaveByDate.get(dateKey);
    const isSunday = date.getDay() === 0;
    const isOutsideActivePeriod = isBefore(date, joinedDate) || isAfter(date, today);
    let status: AttendanceDayStatus = 'neutral';

    if (record) {
      status = 'present';
      summary.present += 1;
      summary.workingDays += 1;
    } else if (leave) {
      status = 'leave';
      if (!isSunday && !isOutsideActivePeriod) {
        summary.leave += 1;
        summary.workingDays += 1;
      }
    } else if (!isSunday && !isOutsideActivePeriod) {
      status = 'absent';
      summary.absent += 1;
      summary.workingDays += 1;
    }

    days.set(dateKey, { date, dateKey, status, attendance: record, leave });
  });

  return { days, summary };
}
