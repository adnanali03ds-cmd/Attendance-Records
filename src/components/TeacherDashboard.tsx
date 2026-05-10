/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, AttendanceRecord, LeaveApplication, Announcement } from '../types';
import { motion } from 'motion/react';
import { 
  QrCode, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlusCircle,
  TrendingUp,
  FileSpreadsheet,
  Bell
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import QRScanner from './QRScanner';
import LeaveForm from './LeaveForm';

export default function TeacherDashboard({ profile }: { profile: UserProfile }) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (statusMsg) {
      const timer = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMsg]);

  useEffect(() => {
    // Attendance
    const attQuery = query(
      collection(db, 'attendance'),
      where('userId', '==', profile.uid),
      orderBy('date', 'desc')
    );
    const unsubscribeAtt = onSnapshot(attQuery, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendance(records);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayRec = records.find(r => r.date === today);
      setTodayRecord(todayRec || null);
    });

    // Leaves
    const leaveQuery = query(
      collection(db, 'leaves'),
      where('userId', '==', profile.uid),
      orderBy('startDate', 'desc')
    );
    const unsubscribeLeaves = onSnapshot(leaveQuery, (snapshot) => {
      setLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveApplication)));
    });

    // Announcements
    const announcementQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeAnnouncements = onSnapshot(announcementQuery, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement)));
    });

    return () => {
      unsubscribeAtt();
      unsubscribeLeaves();
      unsubscribeAnnouncements();
    };
  }, [profile.uid]);

  const statsData = [
    { name: 'Present', value: attendance.length, color: '#3B82F6' },
    { name: 'Absent', value: Math.max(0, 20 - attendance.length - leaves.length), color: '#EF4444' }, // Simplified: assuming 20 working days
    { name: 'Leaves', value: leaves.filter(l => l.status === 'approved').length, color: '#F59E0B' },
  ];

  const handleScanSuccess = async (qrData: string) => {
    // In a real app, qrData would be a signed token or a known secret
    // For this app, any QR with "TGA-SECURE-2026-X7" works
    if (qrData === "TGA-SECURE-2026-X7") {
      setIsScanning(false);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      try {
        if (!todayRecord) {
          // Check-in
          await addDoc(collection(db, 'attendance'), {
            userId: profile.uid,
            userName: profile.name,
            date: today,
            timeIn: serverTimestamp(),
            status: 'present'
          });
          setStatusMsg({ type: 'success', text: "Checked in successfully! Recognition complete." });
        } else if (!todayRecord.timeOut) {
          // Check-out
          await updateDoc(doc(db, 'attendance', todayRecord.id), {
            timeOut: serverTimestamp()
          });
          setStatusMsg({ type: 'success', text: "Checked out successfully! Have a good day." });
        } else {
          setStatusMsg({ type: 'error', text: "You have already finalized your attendance for today." });
        }
      } catch (error) {
        setStatusMsg({ type: 'error', text: "Authentication failed. Please try again." });
        handleFirestoreError(error, OperationType.WRITE, 'attendance');
      }
    } else {
      setStatusMsg({ type: 'error', text: "Identification failed. Invalid security code." });
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Status Message Toast */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
              statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold tracking-tight">{statusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight font-display">Teacher Dashboard</h2>
          <p className="text-slate-500 mt-1 font-medium">Academic Term: Spring 2026 • <span className="text-green-600 font-semibold">Ready for Classes</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsScanning(true)}
            disabled={todayRecord?.timeOut !== undefined && todayRecord !== null}
            className="flex-1 md:flex-none py-2.5 px-5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition-all disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            <QrCode className="w-4 h-4" />
            {todayRecord ? (todayRecord.timeOut ? 'Already Signed Out' : 'Sign Out') : 'Sign In'}
          </button>
          <button 
            onClick={() => setIsApplyingLeave(true)}
            className="flex-1 md:flex-none py-2.5 px-5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-slate-400" />
            Apply Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Chart */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatsCard 
              label="Present Days"
              value={attendance.length.toString()}
              subValue="/ 120"
            />
            <StatsCard 
              label="Attendance Rate"
              value={`${Math.round((attendance.length / (attendance.length + 5 || 1)) * 100)}%`}
              change="+2.1%"
            />
            <StatsCard 
              label="Approved Leaves"
              value={leaves.filter(l => l.status === 'approved').length.toString()}
              valueColor="text-amber-600"
            />
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Attendance Distribution</h3>
              <TrendingUp className="w-4 h-4 text-slate-300" />
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {statsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Attendance History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Recent Activity Log</span>
              <Clock className="w-4 h-4 text-slate-300" />
            </div>
            <div className="overflow-x-auto">
              {attendance.length === 0 ? (
                <p className="text-center py-12 text-slate-400 italic text-sm">No records yet.</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Day</th>
                      <th className="px-6 py-3 text-center">Time In</th>
                      <th className="px-6 py-3 text-center">Time Out</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-slate-700">
                    {attendance.slice(0, 5).map((record) => (
                      <tr key={record.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                        <td className="px-6 py-4 text-slate-500">{format(new Date(record.date), 'EEEE')}</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-400 text-xs">
                          {record.timeIn ? format(record.timeIn.toDate(), 'hh:mm a') : '--:--'}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-400 text-xs">
                          {record.timeOut ? format(record.timeOut.toDate(), 'hh:mm a') : 'PENDING'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            record.timeOut ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {record.timeOut ? 'On Time' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Announcements & Leave Status */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Announcements</h3>
              <Bell className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No new updates.</p>
              ) : (
                announcements.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 relative group">
                    <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.content}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-300 mt-2">
                      {format(item.createdAt.toDate(), 'MMM dd')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Leave Balance</h3>
              <FileSpreadsheet className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-3">
              {leaves.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm italic">No requests filed.</p>
              ) : (
                leaves.slice(0, 4).map((leave) => (
                  <div key={leave.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-700 italic">{leave.type} ({format(new Date(leave.startDate), 'MMM dd')})</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase ${
                      leave.status === 'approved' ? 'text-green-600' :
                      leave.status === 'rejected' ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isScanning && (
        <QRScanner onClose={() => setIsScanning(false)} onScan={handleScanSuccess} />
      )}
      {isApplyingLeave && (
        <LeaveForm profile={profile} onClose={() => setIsApplyingLeave(false)} />
      )}
    </div>
  );
}

function StatsCard({ label, value, subValue, change, valueColor = "text-slate-900" }: { label: string, value: string, subValue?: string, change?: string, valueColor?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className={`text-3xl font-bold tracking-tight ${valueColor}`}>{value}</p>
        {subValue && <span className="text-slate-300 text-lg font-normal mb-0.5">{subValue}</span>}
        {change && <span className="text-green-500 text-xs font-semibold mb-1">{change}</span>}
      </div>
    </div>
  );
}
