/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc, 
  serverTimestamp,
  getDocs,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, AttendanceRecord, LeaveApplication, Announcement } from '../types';
import { ATTENDANCE_LOCATION_DOCUMENT, ATTENDANCE_QR_CODE, AttendanceCampus, AttendanceSettings, getConfiguredCampuses } from '../lib/attendance';
import AttendanceCalendar from './AttendanceCalendar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Calendar,
  Bell, 
  FileSpreadsheet, 
  ShieldCheck, 
  QrCode as QrIcon,
  Send,
  Download,
  Mail,
  UserPlus,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { eachDayOfInterval, format } from 'date-fns';
import * as XLSX from 'xlsx';

const getLeaveDates = (leave: LeaveApplication) => {
  if (leave.dates?.length) return leave.dates;
  if (!leave.startDate || !leave.endDate || leave.endDate < leave.startDate) return [];
  return eachDayOfInterval({
    start: new Date(`${leave.startDate}T00:00:00`),
    end: new Date(`${leave.endDate}T00:00:00`),
  }).map((date) => format(date, 'yyyy-MM-dd'));
};

const formatLeaveDate = (date: string) => format(new Date(`${date}T00:00:00`), 'MMM d, yyyy');

type CampusDraft = Omit<AttendanceCampus, 'latitude' | 'longitude'> & Partial<Pick<AttendanceCampus, 'latitude' | 'longitude'>>;

const DEFAULT_CAMPUSES: CampusDraft[] = [
  { id: 'campus-a', name: 'Campus A', radiusMeters: 50, enabled: true },
  { id: 'campus-b', name: 'Campus B', radiusMeters: 50, enabled: true },
];

export default function AdminDashboard({ profile }: { profile: UserProfile }) {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveApplication[]>([]);
  const [announcement, setAnnouncement] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'leaves' | 'announcements'>('overview');
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', department: '' });
  const [campuses, setCampuses] = useState<CampusDraft[]>(DEFAULT_CAMPUSES);
  const [locationStatus, setLocationStatus] = useState<Record<string, string>>({});
  const [selectedCalendarTeacher, setSelectedCalendarTeacher] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Teachers
    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    // Attendance (all)
    const attUnsubscribe = onSnapshot(query(collection(db, 'attendance'), orderBy('date', 'desc')), (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    });

    // Pending Leaves
    const leavesUnsubscribe = onSnapshot(query(collection(db, 'leaves'), orderBy('appliedAt', 'desc')), (snapshot) => {
      setPendingLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveApplication)));
    });
    const locationUnsubscribe = onSnapshot(doc(db, 'attendanceSettings', ATTENDANCE_LOCATION_DOCUMENT), (snapshot) => {
      if (!snapshot.exists()) return;
      const settings = snapshot.data() as AttendanceSettings;
      const storedCampuses = Array.isArray(settings.campuses) ? settings.campuses : getConfiguredCampuses(settings);
      setCampuses(DEFAULT_CAMPUSES.map((defaultCampus, index) => ({
        ...defaultCampus,
        ...(storedCampuses.find((campus) => campus.id === defaultCampus.id) || storedCampuses[index] || {}),
        id: defaultCampus.id,
      })));
    });

    return () => {
      usersUnsubscribe();
      attUnsubscribe();
      leavesUnsubscribe();
      locationUnsubscribe();
    };
  }, []);

  const handleUpdateLeave = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leaves', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'leaves');
    }
  };

  const handlePostAnnouncement = async (e: any) => {
    e.preventDefault();
    if (!announcement.title || !announcement.content) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        ...announcement,
        authorId: profile.uid,
        createdAt: serverTimestamp()
      });
      setAnnouncement({ title: '', content: '' });
      alert("Announcement posted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'announcements');
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'admin' | 'teacher') => {
    const user = teachers.find((teacher) => teacher.uid === uid);
    if (user?.email === 'adnanali03.ds@gmail.com') return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const updateCampusDraft = (index: number, changes: Partial<CampusDraft>) => {
    setCampuses((current) => current.map((campus, campusIndex) => campusIndex === index ? { ...campus, ...changes } : campus));
  };

  const persistCampuses = async (nextCampuses: CampusDraft[], campusId: string, message: string) => {
    const configuredCampuses = nextCampuses
      .filter((campus) => Number.isFinite(campus.latitude) && Number.isFinite(campus.longitude))
      .map((campus) => ({
        id: campus.id,
        name: campus.name.trim() || (campus.id === 'campus-a' ? 'Campus A' : 'Campus B'),
        enabled: campus.enabled,
        latitude: campus.latitude!,
        longitude: campus.longitude!,
        radiusMeters: Math.min(100, Math.max(3, campus.radiusMeters)),
      }));
    await setDoc(doc(db, 'attendanceSettings', ATTENDANCE_LOCATION_DOCUMENT), {
      campuses: configuredCampuses,
      updatedAt: serverTimestamp(),
      updatedBy: profile.uid,
    }, { merge: true });
    setLocationStatus((current) => ({ ...current, [campusId]: message }));
  };

  const saveCampusDetails = async (index: number) => {
    const campus = campuses[index];
    if (!Number.isFinite(campus.latitude) || !Number.isFinite(campus.longitude)) {
      setLocationStatus((current) => ({ ...current, [campus.id]: 'Set this campus using your current location first.' }));
      return;
    }
    try {
      await persistCampuses(campuses, campus.id, `${campus.name} settings saved.`);
    } catch (error) {
      setLocationStatus((current) => ({ ...current, [campus.id]: 'The campus settings could not be saved.' }));
      handleFirestoreError(error, OperationType.WRITE, 'attendanceSettings/current');
    }
  };

  const saveCampusFromCurrentLocation = (index: number) => {
    const campus = campuses[index];
    if (!navigator.geolocation) {
      setLocationStatus((current) => ({ ...current, [campus.id]: 'This browser does not support location services.' }));
      return;
    }
    setLocationStatus((current) => ({ ...current, [campus.id]: 'Getting your current location…' }));
    navigator.geolocation.getCurrentPosition(async (position) => {
      const nextCampuses = campuses.map((item, campusIndex) => campusIndex === index ? {
        ...item,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      } : item);
      setCampuses(nextCampuses);
      try {
        await persistCampuses(nextCampuses, campus.id, `${campus.name} saved with a ${campus.radiusMeters} m radius.`);
      } catch (error) {
        setLocationStatus((current) => ({ ...current, [campus.id]: 'The campus location could not be saved.' }));
        handleFirestoreError(error, OperationType.WRITE, 'attendanceSettings/current');
      }
    }, () => setLocationStatus((current) => ({ ...current, [campus.id]: 'Location permission was denied. Please allow it and try again.' })), {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 0,
    });
  };

  const handleAddTeacher = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTeacher.name || !newTeacher.email) return;
    
    try {
      // Use a manually generated ID or let Firestore generate one
      await addDoc(collection(db, 'users'), {
        ...newTeacher,
        role: 'teacher',
        createdAt: new Date().toISOString(),
        isPreRegistered: true // Flag to indicate admin added this
      });
      setNewTeacher({ name: '', email: '', department: '' });
      setIsAddingTeacher(false);
      alert("Teacher profile created successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
    }
  };

  const handleRemoveTeacher = async (uid: string) => {
    if (!confirm("Are you sure you want to remove this faculty member? All their login access will be restricted.")) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      alert("Faculty member removed.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'users');
    }
  };

  const exportToExcel = () => {
    const dataToExport = attendance.map(rec => ({
      Teacher: rec.userName,
      Date: rec.date,
      'Time In': rec.timeIn ? format(rec.timeIn.toDate(), 'hh:mm a') : 'N/A',
      'Time Out': rec.timeOut ? format(rec.timeOut.toDate(), 'hh:mm a') : 'N/A',
      Status: rec.status,
      'Check-in Campus': rec.checkInLocation?.campusName || rec.location?.campusName || 'Previous record',
      'Check-out Campus': rec.checkOutLocation?.campusName || (rec.timeOut ? 'Previous record' : 'Not checked out'),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `AcademiTrack_Attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const sendDailyReport = () => {
    // In a real app, this would trigger a cloud function or backend job
    // Here we simulate the content generation
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAtt = attendance.filter(a => a.date === today);
    const summary = `
      Daily Summary Report - ${today}
      Total Teachers: ${teachers.length}
      Present Today: ${todayAtt.length}
      Pending Leaves: ${pendingLeaves.filter(l => l.status === 'pending').length}
    `;
    console.log("Simulating Daily Report Email:", summary);
    alert("Daily summary report generated and sent to simulated admin email.");
  };

  return (
    <div className="dp-page-stack live-dashboard admin-live animate-in fade-in duration-500">
      {/* Header */}
      <section className="dp-hero admin-hero">
        <div>
          <span className="dp-eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Administrator workspace</span>
          <h1>Here’s what’s happening today.</h1>
          <p>{teachers.length} faculty members across two campuses · {format(new Date(), 'EEEE, d MMMM')}</p>
        </div>
        <div className="dp-hero-actions">
          <button 
            onClick={exportToExcel}
            className="dp-btn dp-btn-glass"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button 
            onClick={sendDailyReport}
            className="dp-btn dp-btn-light"
          >
            <Mail className="w-4 h-4" />
            Send Report
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="dp-card live-admin-tabs">
        {[
          { id: 'overview', icon: <Users className="w-4 h-4" />, label: 'Overview' },
          { id: 'users', icon: <ShieldCheck className="w-4 h-4" />, label: 'Faculty' },
          { id: 'leaves', icon: <Clock className="w-4 h-4" />, label: 'Leave Requests' },
          { id: 'announcements', icon: <Bell className="w-4 h-4" />, label: 'Broadcast' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`live-admin-tab ${
              activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="dp-page-stack">
        <section className="dp-metrics-grid">
          <div className="dp-card dp-metric-card"><span className="dp-icon-box blue"><Users size={20} /></span><div className="dp-metric-copy"><span>Total faculty</span><strong>{teachers.length}</strong><small>Registered staff members</small></div></div>
          <div className="dp-card dp-metric-card"><span className="dp-icon-box green"><CheckCircle size={20} /></span><div className="dp-metric-copy"><span>Present today</span><strong>{attendance.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length}</strong><small className="trend-up">Live attendance count</small></div></div>
          <div className="dp-card dp-metric-card"><span className="dp-icon-box amber"><FileSpreadsheet size={20} /></span><div className="dp-metric-copy"><span>Pending leaves</span><strong>{pendingLeaves.filter(l => l.status === 'pending').length}</strong><small>Awaiting your decision</small></div></div>
          <div className="dp-card dp-metric-card"><span className="dp-icon-box violet"><QrIcon size={20} /></span><div className="dp-metric-copy"><span>Active campuses</span><strong>{campuses.filter(c => c.enabled && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)).length}</strong><small>Of two supported locations</small></div></div>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-6">
            <div className="dp-card live-panel flex flex-col items-center">
              <div className="flex justify-between w-full mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Attendance QR Display</h3>
                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-bold uppercase tracking-tight">Live Active</span>
              </div>
              <div className="p-8 bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border-8 border-white shadow-xl">
                 <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]"></div>
                 <div className="bg-white p-6 rounded-xl z-10 shadow-lg relative">
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                    <QRCodeSVG 
                      value={ATTENDANCE_QR_CODE}
                      size={200} 
                      level="H" 
                      includeMargin={true}
                    />
                 </div>
              </div>
              <p className="mt-8 text-xs text-slate-400 text-center max-w-xs font-medium italic">
                Fixed institution QR. Teachers must scan this code and be at the approved location.
                <span className="block mt-2 font-mono text-blue-600 font-bold tracking-widest text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{ATTENDANCE_QR_CODE}</span>
              </p>
            </div>

            <div className="dp-card live-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Campus locations</h3>
                  <p className="mt-2 text-sm text-slate-600">Stand at each campus and save its position. Teachers can check in or check out from either active campus.</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">2 campuses supported</span>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {campuses.map((campus, index) => {
                  const hasLocation = Number.isFinite(campus.latitude) && Number.isFinite(campus.longitude);
                  return (
                    <div key={campus.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${hasLocation && campus.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <input
                            type="checkbox"
                            checked={campus.enabled}
                            onChange={(event) => updateCampusDraft(index, { enabled: event.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          Active
                        </label>
                      </div>
                      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Campus name
                        <input value={campus.name} onChange={(event) => updateCampusDraft(index, { name: event.target.value })} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800" />
                      </label>
                      <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Allowed radius (3–100 m)
                        <input type="number" min="3" max="100" value={campus.radiusMeters} onChange={(event) => updateCampusDraft(index, { radiusMeters: Math.min(100, Math.max(3, Number(event.target.value) || 3)) })} className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800" />
                      </label>
                      <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[10px] text-slate-500">
                        {hasLocation ? `${campus.latitude!.toFixed(6)}, ${campus.longitude!.toFixed(6)}` : 'Location has not been set yet.'}
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <button onClick={() => saveCampusFromCurrentLocation(index)} className="rounded-lg bg-blue-600 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-blue-700">Use my location</button>
                        <button onClick={() => saveCampusDetails(index)} disabled={!hasLocation} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 disabled:opacity-40">Save changes</button>
                      </div>
                      {locationStatus[campus.id] && <p className="mt-2 text-[11px] font-medium text-slate-600">{locationStatus[campus.id]}</p>}
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] text-amber-700">A 3 m radius is supported, but phone GPS can be less accurate indoors. Increase it if valid attendance is rejected.</p>
            </div>

            <div className="dp-card live-table-card overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Live Activity Stream</span>
                <Clock className="w-4 h-4 text-slate-300" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-6 py-3 font-medium">Teacher</th>
                      <th className="px-6 py-3 font-medium text-center">Punch Status</th>
                      <th className="px-6 py-3 text-right">Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendance.slice(0, 10).map(rec => (
                      <tr key={rec.id} className="text-sm hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{rec.userName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{rec.date}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            rec.timeOut ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {rec.timeOut ? 'Completed' : 'On Campus'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs font-mono text-slate-400">
                            IN: {rec.timeIn ? format(rec.timeIn.toDate(), 'hh:mm a') : '--:--'}
                          </p>
                          <p className="text-xs font-mono text-slate-400">
                            OUT: {rec.timeOut ? format(rec.timeOut.toDate(), 'hh:mm a') : '--:--'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="live-insight-card">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-8">Faculty Insights</h3>
              <div className="space-y-8">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Total Active Faculty</p>
                  <p className="text-4xl font-bold tracking-tight">{teachers.length}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Currently Present</p>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold tracking-tight">{attendance.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length}</p>
                    <span className="text-green-400 text-xs font-bold mb-1">Peak Hour</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1 font-bold">Approved Leaves (MTD)</p>
                  <p className="text-4xl font-bold tracking-tight text-amber-500">{pendingLeaves.filter(l => l.status === 'approved').length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Faculty Management</h3>
            <button 
              onClick={() => setIsAddingTeacher(true)}
              className="py-2 px-4 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm shadow-blue-100"
            >
              <Plus className="w-4 h-4" />
              Add Teacher
            </button>
          </div>

          <div className="dp-card live-table-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Faculty Roster</span>
              <span className="text-[10px] font-bold text-slate-400">{teachers.length} Members</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {teachers.map(teacher => (
                    <tr key={teacher.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-slate-900">{teacher.name}</p>
                          <button
                            onClick={() => setSelectedCalendarTeacher(teacher)}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 hover:bg-blue-100"
                          >
                            <Calendar className="h-3 w-3" /> Calendar
                          </button>
                        </div>
                        {teacher.department && <p className="text-[10px] text-slate-400 font-medium">{teacher.department}</p>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{teacher.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                          teacher.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {teacher.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-4">
                          {teacher.email === 'adnanali03.ds@gmail.com' ? (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Permanent admin</span>
                          ) : <>
                            <button
                              onClick={() => handleRoleChange(teacher.uid, teacher.role === 'admin' ? 'teacher' : 'admin')}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                            >
                              Swap Role
                            </button>
                          {teacher.email !== profile.email && (
                            <button 
                              onClick={() => handleRemoveTeacher(teacher.uid)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                              title="Remove Teacher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Teacher Modal */}
          <AnimatePresence>
            {isAddingTeacher && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
                >
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-900">Add New Teacher</h3>
                    <button onClick={() => setIsAddingTeacher(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleAddTeacher} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={newTeacher.name}
                        onChange={(e) => setNewTeacher({...newTeacher, name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                        placeholder="e.g. Prof. John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                      <input 
                        type="email" 
                        required
                        value={newTeacher.email}
                        onChange={(e) => setNewTeacher({...newTeacher, email: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                        placeholder="teacher@theguideacademy.edu"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Department</label>
                      <input 
                        type="text" 
                        value={newTeacher.department}
                        onChange={(e) => setNewTeacher({...newTeacher, department: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm"
                        placeholder="e.g. Science, Mathematics"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsAddingTeacher(false)}
                        className="flex-1 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                      >
                        Register Teacher
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingLeaves.filter(l => l.status === 'pending').map(leave => (
            <div key={leave.id} className="dp-card live-request-card flex flex-col justify-between hover:border-blue-200 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900">{leave.userName}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{leave.type}</span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold">{format(leave.appliedAt.toDate(), 'MMM dd')}</span>
                </div>
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Complete leave period</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-800">{formatLeaveDate(leave.startDate)} – {formatLeaveDate(leave.endDate)}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">{leave.totalDays || getLeaveDates(leave).length} {(leave.totalDays || getLeaveDates(leave).length) === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {getLeaveDates(leave).map((date) => <span key={date} className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600">{format(new Date(`${date}T00:00:00`), 'EEE, MMM d')}</span>)}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 italic">
                  <p className="text-xs text-slate-500 leading-relaxed">"{leave.reason}"</p>
                </div>
              </div>
              <div className="flex gap-2 mt-8">
                <button 
                  onClick={() => handleUpdateLeave(leave.id, 'approved')}
                  className="flex-1 py-2 bg-green-600 text-white text-[10px] font-bold rounded uppercase tracking-widest hover:bg-green-700 transition-all shadow-sm"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleUpdateLeave(leave.id, 'rejected')}
                  className="flex-1 py-2 bg-white text-slate-400 border border-slate-200 text-[10px] font-bold rounded uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          {pendingLeaves.filter(l => l.status === 'pending').length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
              <CheckCircle className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-medium">All applications have been processed.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="max-w-2xl dp-card live-panel">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-rose-50 rounded-lg">
              <Bell className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Broadcast Centre</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Immediate Faculty Notification</p>
            </div>
          </div>
          <form onSubmit={handlePostAnnouncement} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Subject</label>
              <input 
                type="text" 
                required
                value={announcement.title}
                onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                placeholder="Institutional Announcement Title"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all text-sm font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Announcement Body</label>
              <textarea 
                rows={6}
                required
                value={announcement.content}
                onChange={(e) => setAnnouncement({...announcement, content: e.target.value})}
                placeholder="Compose your message for the faculty network..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all resize-none text-sm leading-relaxed"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              Send to All
            </button>
          </form>
        </div>
      )}

      <AnimatePresence>
        {selectedCalendarTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] overflow-y-auto bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="mx-auto max-w-6xl"
            >
              <AttendanceCalendar
                profile={selectedCalendarTeacher}
                attendance={attendance.filter((record) => record.userId === selectedCalendarTeacher.uid)}
                leaves={pendingLeaves.filter((leave) => leave.userId === selectedCalendarTeacher.uid)}
                onClose={() => setSelectedCalendarTeacher(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
