import { useEffect, useState, type FormEvent } from 'react';
import { UserProfile } from '../types';
import { CheckCircle2, UserRound, X } from 'lucide-react';

const schoolRoles = ['Teacher', 'Principal', 'Coordinator', 'Office Staff', 'Other'] as const;

type ProfileFields = Pick<UserProfile, 'name' | 'schoolRole' | 'subjects' | 'classes'>;

function splitItems(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export default function ProfileForm({ profile, onSave, onClose, required = false }: {
  profile: UserProfile;
  onSave: (fields: ProfileFields) => Promise<void>;
  onClose?: () => void;
  required?: boolean;
}) {
  const [name, setName] = useState(profile.name || '');
  const [schoolRole, setSchoolRole] = useState<UserProfile['schoolRole']>(profile.schoolRole);
  const [subjects, setSubjects] = useState((profile.subjects || []).join(', '));
  const [classes, setClasses] = useState((profile.classes || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolRole !== 'Teacher') {
      setSubjects('');
      setClasses('');
    }
  }, [schoolRole]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !schoolRole) {
      setError('Please enter your full name and select your role in the school.');
      return;
    }
    if (schoolRole === 'Teacher' && (!splitItems(subjects).length || !splitItems(classes).length)) {
      setError('Please add at least one subject and one class you teach.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        schoolRole,
        subjects: schoolRole === 'Teacher' ? splitItems(subjects) : [],
        classes: schoolRole === 'Teacher' ? splitItems(classes) : [],
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
          {schoolRole === 'Teacher' && <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <p className="text-sm font-bold text-blue-800">Teaching details</p>
            <label className="block text-sm font-semibold text-slate-700">Subjects you teach
              <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="e.g. Mathematics, Science" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Classes you teach
              <input value={classes} onChange={(e) => setClasses(e.target.value)} placeholder="e.g. Class 6, Class 7A" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <p className="text-xs text-slate-500">Separate multiple subjects or classes with commas.</p>
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
