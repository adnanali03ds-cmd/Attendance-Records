/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { eachDayOfInterval, format } from 'date-fns';
import { X, Calendar, FileText } from 'lucide-react';

export default function LeaveForm({ profile, onClose }: { profile: UserProfile, onClose: () => void }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'casual' as 'sick' | 'casual' | 'vacation'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const requestedDates = formData.startDate && formData.endDate && formData.endDate >= formData.startDate
    ? eachDayOfInterval({
        start: new Date(`${formData.startDate}T00:00:00`),
        end: new Date(`${formData.endDate}T00:00:00`),
      }).map((date) => format(date, 'yyyy-MM-dd'))
    : [];

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!requestedDates.length) {
      setFormError('The end date must be the same as or later than the start date.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'leaves'), {
        userId: profile.uid,
        userName: profile.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        dates: requestedDates,
        totalDays: requestedDates.length,
        reason: formData.reason,
        type: formData.type,
        status: 'pending',
        appliedAt: serverTimestamp()
      });
      alert("Application submitted successfully!");
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'leaves');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leave Application</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                <input 
                  type="date" 
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all text-sm font-medium text-slate-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                <input 
                  type="date" 
                  required
                  min={formData.startDate || undefined}
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all text-sm font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          {requestedDates.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <p className="text-xs font-bold text-blue-800">{requestedDates.length} {requestedDates.length === 1 ? 'day' : 'days'} requested</p>
              <p className="mt-1 text-xs leading-relaxed text-blue-700">{requestedDates.map((date) => format(new Date(`${date}T00:00:00`), 'MMM d')).join(' • ')}</p>
            </div>
          )}
          {formError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{formError}</p>}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Leave Type</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all text-sm font-medium text-slate-700 appearance-none"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="vacation">Vacation</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Reason / Remarks</label>
            <textarea 
              rows={4}
              required
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              placeholder="State the reason broadly..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-200 outline-none transition-all resize-none text-sm leading-relaxed text-slate-600 font-medium"
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm transition-all disabled:bg-slate-200 disabled:text-slate-400"
          >
            {submitting ? 'Authenticating Request...' : 'Finalize Application'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
