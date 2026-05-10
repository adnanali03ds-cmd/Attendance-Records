/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  addDoc, 
  serverTimestamp,
  getDocs 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, AttendanceRecord, LeaveApplication, Announcement } from '../types';
import { motion } from 'motion/react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Bell, 
  FileSpreadsheet, 
  ShieldCheck, 
  QrCode as QrIcon,
  Send,
  Download,
  Mail,
  UserPlus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function AdminDashboard({ profile }: { profile: UserProfile }) {
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveApplication[]>([]);
  const [announcement, setAnnouncement] = useState({ title: '', content: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'leaves' | 'announcements'>('overview');

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

    return () => {
      usersUnsubscribe();
      attUnsubscribe();
      leavesUnsubscribe();
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
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const exportToExcel = () => {
    const dataToExport = attendance.map(rec => ({
      Teacher: rec.userName,
      Date: rec.date,
      'Time In': rec.timeIn ? format(rec.timeIn.toDate(), 'hh:mm a') : 'N/A',
      'Time Out': rec.timeOut ? format(rec.timeOut.toDate(), 'hh:mm a') : 'N/A',
      Status: rec.status
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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight font-display">Admin Console</h2>
          <p className="text-slate-500 mt-1 font-medium italic">Academic Term: Spring 2026 • <span className="text-green-600 font-semibold uppercase text-[10px] tracking-widest ml-2 border border-green-200 px-2 py-0.5 rounded-full">Excel Synced</span></p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none py-2.5 px-5 bg-white text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export Excel
          </button>
          <button 
            onClick={sendDailyReport}
            className="flex-1 md:flex-none py-2.5 px-5 bg-blue-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition-all"
          >
            <Mail className="w-4 h-4" />
            Send Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 w-full gap-8">
        {[
          { id: 'overview', icon: <Users className="w-4 h-4" />, label: 'Overview' },
          { id: 'users', icon: <ShieldCheck className="w-4 h-4" />, label: 'Faculty' },
          { id: 'leaves', icon: <Clock className="w-4 h-4" />, label: 'Leave Requests' },
          { id: 'announcements', icon: <Bell className="w-4 h-4" />, label: 'Broadcast' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all relative ${
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
              <div className="flex justify-between w-full mb-8">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Attendance QR Display</h3>
                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded font-bold uppercase tracking-tight">Live Active</span>
              </div>
              <div className="p-8 bg-slate-900 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border-8 border-white shadow-xl">
                 <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]"></div>
                 <div className="bg-white p-6 rounded-xl z-10 shadow-lg relative">
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full animate-ping"></div>
                    <QRCodeSVG 
                      value="TGA-SECURE-2026-X7" 
                      size={200} 
                      level="H" 
                      includeMargin={true}
                    />
                 </div>
              </div>
              <p className="mt-8 text-xs text-slate-400 text-center max-w-xs font-medium italic">
                Daily dynamic token. Teachers must scan this or enter manual code: 
                <span className="block mt-2 font-mono text-blue-600 font-bold tracking-widest text-[11px] bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">TGA-SECURE-2026-X7</span>
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
            <div className="bg-slate-900 p-8 rounded-xl text-white shadow-xl border border-white">
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
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Faculty Roster</span>
            <span className="text-[10px] font-bold text-slate-400">{teachers.length} Members</span>
          </div>
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
                  <td className="px-6 py-4 font-bold text-slate-900">{teacher.name}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{teacher.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${
                      teacher.role === 'admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {teacher.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleRoleChange(teacher.uid, teacher.role === 'admin' ? 'teacher' : 'admin')}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest"
                    >
                      Swap Role
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingLeaves.filter(l => l.status === 'pending').map(leave => (
            <div key={leave.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-colors">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-bold text-slate-900">{leave.userName}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase tracking-widest">{leave.type}</span>
                  </div>
                  <span className="text-[10px] text-slate-300 font-bold">{format(leave.appliedAt.toDate(), 'MMM dd')}</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                   <Calendar className="w-3 h-3 text-slate-400" />
                   <p className="text-xs font-semibold text-slate-600">{leave.startDate} to {leave.endDate}</p>
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
        <div className="max-w-xl bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
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
    </div>
  );
}
