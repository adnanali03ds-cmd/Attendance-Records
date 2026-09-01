import { useEffect, useState, type FormEvent } from 'react';
import { TeachingAssignment, UserProfile } from '../types';
import { ArrowUpRight, CheckCircle2, Sparkles, Trash2, X } from 'lucide-react';

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
    <div className={required ? 'fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#111224]/65 p-3 backdrop-blur-md sm:p-6' : 'p-1'}>
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      <form onSubmit={submit} className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] border border-white/80 bg-[#fbfbfd] shadow-[0_30px_90px_rgba(15,23,42,0.35)] sm:max-h-[calc(100vh-3rem)]">
        <header className="shrink-0 px-5 pb-4 pt-5 sm:px-8 sm:pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" aria-hidden="true">
              <span className="h-3.5 w-3.5 rounded-full bg-[#ff6b63] shadow-sm" />
              <span className="h-3.5 w-3.5 rounded-full bg-[#ffc34f] shadow-sm" />
              <span className="h-3.5 w-3.5 rounded-full bg-[#5ac66f] shadow-sm" />
            </div>
            {onClose && <button type="button" onClick={onClose} aria-label="Close profile form" title="Close form" className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_5px_14px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-violet-100"><X className="h-5 w-5" /></button>}
          </div>
          <div className="mt-4 border-t border-slate-200 pt-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">The Guide Academy</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{required ? 'Create your school profile' : 'Refine your profile'}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">Tell us a little about your work so attendance stays beautifully organised.</p>
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-8">
          <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-50" /><span className="truncate">Signed in as <strong className="text-slate-700">{profile.email}</strong></span>
          </div>

          <div className="space-y-5">
            <label className="block text-sm font-semibold text-slate-700">Full name <span className="text-violet-600">*</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_3px_10px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </label>

            <label className="block text-sm font-semibold text-slate-700">Role in the school <span className="text-violet-600">*</span>
              <select value={schoolRole || ''} onChange={(e) => setSchoolRole(e.target.value as UserProfile['schoolRole'])} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 shadow-[0_3px_10px_rgba(15,23,42,0.05)] outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                <option value="">Choose your role</option>
                {schoolRoles.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>

            {schoolRole === 'Other' && <label className="block text-sm font-semibold text-slate-700">Your role <span className="text-violet-600">*</span>
              <input value={schoolRoleOther} onChange={(e) => setSchoolRoleOther(e.target.value)} placeholder="For example: Librarian" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-[0_3px_10px_rgba(15,23,42,0.05)] outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </label>}

            {schoolRole === 'Teacher' && <section className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-cyan-50/70 p-4 sm:p-5">
              <div className="mb-5">
                <p className="font-bold text-slate-900">Build your teaching map</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Choose one subject, select its classes, then add it. Repeat for every subject you teach.</p>
              </div>

              <label className="block text-sm font-semibold text-slate-700">Subject
                <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                  <option value="">Select a subject</option>
                  {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </label>

              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-700">Classes for {selectedSubject || 'this subject'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {classOptions.map((className) => {
                    const selected = selectedClasses.includes(className);
                    return <button key={className} type="button" onClick={() => toggleSelection(className, selectedClasses, setSelectedClasses)} className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-violet-600 bg-violet-600 text-white shadow-md shadow-violet-200' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700'}`}>{selected && <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />}{className}</button>;
                  })}
                </div>
              </div>

              <button type="button" onClick={addAssignment} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700 hover:shadow-md">+ Add subject assignment</button>

              {assignments.length > 0 && <div className="mt-5 border-t border-violet-100 pt-5">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Your assignments</p>
                <div className="grid gap-2">
                  {assignments.map((assignment) => <div key={assignment.subject} className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm"><div className="min-w-0"><p className="font-bold text-slate-900">{assignment.subject}</p><p className="mt-0.5 truncate text-xs text-slate-500">{assignment.classes.join(' · ')}</p></div><button type="button" aria-label={`Remove ${assignment.subject}`} onClick={() => setAssignments((current) => current.filter((item) => item.subject !== assignment.subject))} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}
                </div>
              </div>}
            </section>}
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-[#fbfbfd]/95 px-5 py-4 backdrop-blur sm:px-8 sm:py-5">
          {error && <p className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
          <button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-4 font-bold text-white shadow-[0_10px_25px_rgba(109,40,217,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(109,40,217,0.35)] disabled:translate-y-0 disabled:opacity-60">
            {saving ? 'Saving your profile…' : 'Save and continue'} {saving ? <CheckCircle2 className="h-5 w-5 animate-pulse" /> : <ArrowUpRight className="h-5 w-5" />}
          </button>
        </footer>
      </form>
    </div>
  );
}

