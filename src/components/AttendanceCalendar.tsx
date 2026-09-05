import { useEffect, useMemo, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameMonth, startOfMonth } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, X } from 'lucide-react';
import { buildAttendanceYear } from '../lib/attendanceCalendar';
import { AttendanceRecord, LeaveApplication, UserProfile } from '../types';

interface AttendanceCalendarProps {
  profile: UserProfile;
  attendance: AttendanceRecord[];
  leaves: LeaveApplication[];
  onClose?: () => void;
  mode?: 'year' | 'month';
}

const statusStyles = {
  present: 'bg-emerald-500 text-white hover:bg-emerald-600',
  absent: 'bg-rose-500 text-white hover:bg-rose-600',
  leave: 'bg-amber-400 text-amber-950 hover:bg-amber-500',
  neutral: 'bg-slate-50 text-slate-300 hover:bg-slate-100',
};

const timestampLabel = (value: any) => value?.toDate ? format(value.toDate(), 'hh:mm a') : 'Not recorded';

export default function AttendanceCalendar({ profile, attendance, leaves, onClose, mode = 'year' }: AttendanceCalendarProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const modelYear = mode === 'month' ? visibleMonth.getFullYear() : year;
  const model = useMemo(
    () => buildAttendanceYear(attendance, leaves, modelYear, profile.createdAt),
    [attendance, leaves, profile.createdAt, modelYear],
  );
  const months = useMemo(
    () => mode === 'month'
      ? [visibleMonth]
      : Array.from({ length: 12 }, (_, month) => new Date(year, month, 1)),
    [mode, visibleMonth, year],
  );
  const displayedSummary = useMemo(() => {
    if (mode === 'year') return model.summary;
    const monthPrefix = format(visibleMonth, 'yyyy-MM');
    const summary = { present: 0, absent: 0, leave: 0, workingDays: 0 };
    model.days.forEach((day) => {
      if (!day.dateKey.startsWith(monthPrefix)) return;
      if (day.status === 'present') summary.present += 1;
      if (day.status === 'absent') summary.absent += 1;
      if (day.status === 'leave') summary.leave += 1;
    });
    summary.workingDays = summary.present + summary.absent + summary.leave;
    return summary;
  }, [mode, model, visibleMonth]);
  const selected = selectedDate ? model.days.get(selectedDate) : undefined;

  useEffect(() => setSelectedDate(null), [profile.uid, year, visibleMonth]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2.5"><CalendarDays className="h-5 w-5 text-blue-700" /></div>
          <div>
            <h3 className="font-bold text-slate-900">{mode === 'month' ? `${format(visibleMonth, 'MMMM yyyy')} attendance` : `${profile.name}'s attendance calendar`}</h3>
            <p className="text-xs text-slate-500">Green is present, red is absent, and orange is approved leave.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          {mode === 'year' && <>
            <button onClick={() => setYear((value) => value - 1)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-blue-600" aria-label="Previous year"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-16 text-center text-sm font-bold text-slate-800">{year}</span>
            <button onClick={() => setYear((value) => value + 1)} disabled={year >= new Date().getFullYear()} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-blue-600 disabled:opacity-30" aria-label="Next year"><ChevronRight className="h-4 w-4" /></button>
          </>}
          {onClose && <button onClick={onClose} className="ml-2 rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Close calendar"><X className="h-5 w-5" /></button>}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className={mode === 'month' ? 'mx-auto grid max-w-xl grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
          {months.map((month) => {
            const leadingBlanks = (getDay(startOfMonth(month)) + 6) % 7;
            const dates = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
            return (
              <div key={month.toISOString()} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <h4 className="mb-2 text-center text-xs font-bold uppercase tracking-widest text-slate-600">{format(month, mode === 'month' ? 'MMMM yyyy' : 'MMMM')}</h4>
                <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold uppercase text-slate-300">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {Array.from({ length: leadingBlanks }, (_, index) => <span key={`blank-${index}`} />)}
                  {dates.map((date) => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const info = model.days.get(dateKey)!;
                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(dateKey)}
                        title={`${format(date, 'MMM d')}: ${info.status}`}
                        className={`aspect-square rounded-md text-[10px] font-bold transition-all ${statusStyles[info.status]} ${selectedDate === dateKey ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
                      >
                        {format(date, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {mode === 'month' && (
          <div className="mx-auto mt-5 flex max-w-xl items-center justify-between gap-3">
            <button onClick={() => setVisibleMonth((month) => addMonths(month, -1))} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" /> Previous Month
            </button>
            <button onClick={() => setVisibleMonth((month) => addMonths(month, 1))} disabled={isSameMonth(visibleMonth, new Date())} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400">
              Next Month <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {selected && (
          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold text-slate-900">{format(selected.date, 'EEEE, MMMM d, yyyy')}</p>
              <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${selected.status === 'present' ? 'bg-emerald-100 text-emerald-700' : selected.status === 'absent' ? 'bg-rose-100 text-rose-700' : selected.status === 'leave' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{selected.status === 'neutral' ? 'Non-working / future' : selected.status}</span>
            </div>
            {selected.attendance && (
              <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-blue-500" /><span><strong className="block text-slate-800">Check-in: {timestampLabel(selected.attendance.timeIn)}</strong>{selected.attendance.checkInLocation?.campusName || selected.attendance.location?.campusName || 'Campus not recorded on this older entry'}</span></div>
                <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-blue-500" /><span><strong className="block text-slate-800">Check-out: {timestampLabel(selected.attendance.timeOut)}</strong>{selected.attendance.checkOutLocation?.campusName || (selected.attendance.timeOut ? 'Campus not recorded on this older entry' : 'Attendance is still active')}</span></div>
              </div>
            )}
            {selected.leave && <p className="mt-2 text-xs text-slate-600">Approved {selected.leave.type} leave: {selected.leave.reason}</p>}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Days present" value={displayedSummary.present} className="bg-emerald-50 text-emerald-700" />
          <SummaryCard label="Days absent" value={displayedSummary.absent} className="bg-rose-50 text-rose-700" />
          <SummaryCard label="Approved leave" value={displayedSummary.leave} className="bg-amber-50 text-amber-700" />
          <SummaryCard label="Working days" value={displayedSummary.workingDays} className="bg-blue-50 text-blue-700" />
        </div>
        <p className="mt-3 text-[10px] text-slate-400">Sundays, future dates, and dates before this profile was created are not counted as absences.</p>
      </div>
    </section>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: number; className: string }) {
  return <div className={`rounded-xl p-4 ${className}`}><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>;
}
