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
    <div className={required ? 'fixed inset-0 z-[300] bg-slate-950/45 p-4 flex items-center justify-center' : 'p-1'}>
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl bg-white p-6 md:p-8 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-blue-100 p-3"><UserRound className="h-6 w-6 text-blue-700" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{required ? 'Complete your profile' : 'Edit profile'}</h2>
              <p className="mt-1 text-sm text-slate-500">Keep your school details accurate for the attendance system.</p>
            </div>
          </div>
          {!required && onClose && <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Signed in as <strong className="text-slate-800">{profile.email}</strong>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Full name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Khan" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Your role in the school
            <select value={schoolRole || ''} onChange={(e) => setSchoolRole(e.target.value as UserProfile['schoolRole'])} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Select your role</option>
              {schoolRoles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          {schoolRole === 'Other' && <label className="block text-sm font-semibold text-slate-700">Write your role
            <input value={schoolRoleOther} onChange={(e) => setSchoolRoleOther(e.target.value)} placeholder="e.g. Librarian" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>}
          {schoolRole === 'Teacher' && <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-sm font-bold text-blue-800">Add a teaching assignment</p>
            <label className="block text-sm font-semibold text-slate-700">Subject
              <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                <option value="">Select a subject</option>
                {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Classes for {selectedSubject || 'this subject'}
              <span className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3">
                {classOptions.map((className) => <label key={className} className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={selectedClasses.includes(className)} onChange={() => toggleSelection(className, selectedClasses, setSelectedClasses)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />{className}</label>)}
              </span>
            </label>
            <button type="button" onClick={addAssignment} className="w-full rounded-lg border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50">Add subject assignment</button>
            {assignments.length > 0 && <div className="space-y-2 border-t border-blue-100 pt-4">
              <p className="text-sm font-bold text-blue-800">Your assignments</p>
              {assignments.map((assignment) => <div key={assignment.subject} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"><span><strong>{assignment.subject}</strong> → {assignment.classes.join(', ')}</span><button type="button" onClick={() => setAssignments((current) => current.filter((item) => item.subject !== assignment.subject))} className="font-semibold text-rose-600">Remove</button></div>)}
            </div>}
          </div>}
        </div>

        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
        <button disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          <CheckCircle2 className="h-5 w-5" /> {saving ? 'Saving profile…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
