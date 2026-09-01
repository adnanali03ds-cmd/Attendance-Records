import { useEffect, useState, type FormEvent } from 'react';
import { TeachingAssignment, UserProfile } from '../types';
import { CheckCircle2, UserRound, X } from 'lucide-react';

const schoolRoles = ['Teacher', 'Principal', 'Coordinator', 'Office Staff', 'Other'] as const;
const subjectOptions = ['English', 'Hindi', 'Maths', 'Computer', 'EVS', 'GK', 'Urdu', 'Deeniyat', 'Games'];
const classOptions = ['Nursery', 'L.K.G', 'U.K.G', 'Class-1', 'Class-2', 'Class-3', 'Class-4'];

type ProfileFields = Pick<UserProfile, 'name' | 'schoolRole' | 'schoolRoleOther' | 'subjects' | 'classes' | 'teachingAssignments'>;

export default function ProfileForm({ profile, onSave, onClose, required = false }: {
  profile: UserProfile;
  onSave: (fields: ProfileFields) => Promise<void>;
  onClose?: () => void;
  required?: boolean;
}) {
  const [name, setName] = useState(required ? '' : profile.name || '');
  const [schoolRole, setSchoolRole] = useState<UserProfile['schoolRole']>(profile.schoolRole);
  const [schoolRoleOther, setSchoolRoleOther] = useState(profile.schoolRoleOther || '');
  const [assignments, setAssignments] = useState<TeachingAssignment[]>(profile.teachingAssignments || []);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolRole !== 'Teacher') {
      setAssignments([]);
      setSelectedSubject('');
      setSelectedClasses([]);
    }
  }, [schoolRole]);

  const toggleSelection = (value: string, current: string[], setCurrent: (items: string[]) => void) => {
    setCurrent(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const addAssignment = () => {
    if (!selectedSubject || !selectedClasses.length) {
      setError('Select one subject and at least one class before adding the assignment.');
      return;
    }
    setAssignments((current) => {
      const withoutSubject = current.filter((assignment) => assignment.subject !== selectedSubject);
      return [...withoutSubject, { subject: selectedSubject, classes: selectedClasses }];
    });
    setSelectedSubject('');
    setSelectedClasses([]);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !schoolRole) {
      setError('Please enter your full name and select your role in the school.');
      return;
    }
    if (schoolRole === 'Other' && !schoolRoleOther.trim()) {
      setError('Please enter your role in the school.');
      return;
    }
    if (schoolRole === 'Teacher' && !assignments.length) {
      setError('Add at least one subject assignment before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        schoolRole,
        schoolRoleOther: schoolRole === 'Other' ? schoolRoleOther.trim() : '',
        teachingAssignments: schoolRole === 'Teacher' ? assignments : [],
        subjects: schoolRole === 'Teacher' ? assignments.map((assignment) => assignment.subject) : [],
        classes: schoolRole === 'Teacher' ? Array.from(new Set<string>(assignments.flatMap((assignment) => assignment.classes))) : [],
      });
      onClose?.();
    } catch {
      setError('Your profile could not be saved. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={required ? 'fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5' : 'p-1'}>
      <form onSubmit={submit} className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white sm:px-7">
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/15 p-2.5"><UserRound className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">The Guide Academy</p>
              <h2 className="mt-0.5 text-lg font-bold">{required ? 'Set up your profile' : 'Edit your profile'}</h2>
              <p className="mt-0.5 text-sm text-blue-100">Your details help us keep records organised.</p>
            </div>
          </div>
          {onClose && <button type="button" onClick={onClose} aria-label="Close profile form" title="Close form" className="shrink-0 rounded-lg p-2 text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white"><X className="h-5 w-5" /></button>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Signed in as <strong className="truncate text-slate-800">{profile.email}</strong>
          </div>

          <div className="space-y-5">
          <label className="block text-sm font-semibold text-slate-700">Full name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Your role in the school
            <select value={schoolRole || ''} onChange={(e) => setSchoolRole(e.target.value as UserProfile['schoolRole'])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
              <option value="">Select your role</option>
              {schoolRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          {schoolRole === 'Other' && <label className="block text-sm font-semibold text-slate-700">Write your role
            <input value={schoolRoleOther} onChange={(e) => setSchoolRoleOther(e.target.value)} placeholder="e.g. Librarian" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>}
          {schoolRole === 'Teacher' && <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">
            <div><p className="text-sm font-bold text-blue-950">Teaching assignments</p><p className="mt-1 text-xs text-slate-500">Add each subject with the exact classes you teach.</p></div>
            <label className="block text-sm font-semibold text-slate-700">Subject
              <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                <option value="">Select a subject</option>
                {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Classes for {selectedSubject || 'this subject'}
              <span className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
                {classOptions.map((className) => <label key={className} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-blue-50"><input type="checkbox" checked={selectedClasses.includes(className)} onChange={() => toggleSelection(className, selectedClasses, setSelectedClasses)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{className}</label>)}
              </span>
            </label>
            <button type="button" onClick={addAssignment} className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100">+ Add this subject</button>
            {assignments.length > 0 && <div className="space-y-2 border-t border-blue-100 pt-4">
              <p className="text-sm font-bold text-blue-950">Added assignments</p>
              {assignments.map((assignment) => <div key={assignment.subject} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3.5 py-3 text-sm shadow-sm"><span className="min-w-0"><strong className="text-slate-900">{assignment.subject}</strong><span className="text-slate-500"> · {assignment.classes.join(', ')}</span></span><button type="button" onClick={() => setAssignments((current) => current.filter((item) => item.subject !== assignment.subject))} className="shrink-0 font-semibold text-rose-600 hover:text-rose-700">Remove</button></div>)}
            </div>}
          </div>}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
          {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">{error}</p>}
          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60">
            <CheckCircle2 className="h-5 w-5" /> {saving ? 'Saving profile…' : 'Save profile'}
          </button>
        </footer>
      </form>
    </div>
  );
}
