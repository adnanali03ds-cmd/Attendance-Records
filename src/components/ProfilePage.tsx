import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { UserProfile } from '../types';
import ProfileForm from './ProfileForm';

type ProfileFields = Pick<UserProfile, 'name' | 'schoolRole' | 'schoolRoleOther' | 'subjects' | 'classes' | 'teachingAssignments'>;

export default function ProfilePage({ profile, onSave }: {
  profile: UserProfile;
  onSave: (fields: ProfileFields) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const initials = profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const schoolRole = profile.schoolRole === 'Other' ? profile.schoolRoleOther : profile.schoolRole;
  const joined = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : 'Not available';

  if (editing) {
    return (
      <div className="dp-page-stack profile-page">
        <header className="dp-page-title">
          <div>
            <span className="dp-kicker">My profile</span>
            <h1>Edit your information</h1>
            <p>Update your personal details and teaching assignments.</p>
          </div>
          <button className="dp-btn dp-btn-secondary" onClick={() => setEditing(false)}><ArrowLeft size={16} /> Back to profile</button>
        </header>
        <ProfileForm profile={profile} onSave={onSave} onClose={() => setEditing(false)} embedded />
      </div>
    );
  }

  return (
    <div className="dp-page-stack profile-page">
      <header className="profile-cover">
        <div className="profile-cover-pattern" />
        <div className="profile-identity">
          <div className="profile-avatar">{initials}</div>
          <div>
            <span className="profile-verified"><CheckCircle2 size={13} /> Verified school account</span>
            <h1>{profile.name}</h1>
            <p>{schoolRole || (profile.role === 'admin' ? 'Administrator' : 'Teacher')} · The Guide Academy</p>
          </div>
        </div>
        <span className={`profile-role-badge ${profile.role}`}><ShieldCheck size={15} /> {profile.email === 'adnanali03.ds@gmail.com' ? 'Permanent admin' : profile.role}</span>
      </header>

      <section className="profile-content-grid">
        <article className="dp-card profile-details-card">
          <div className="dp-section-head">
            <div><span className="dp-kicker">Personal information</span><h2>About you</h2></div>
            <UserRound size={20} />
          </div>
          <div className="profile-detail-list">
            <div><span className="profile-detail-icon"><UserRound size={17} /></span><div><small>Full name</small><strong>{profile.name}</strong></div></div>
            <div><span className="profile-detail-icon"><Mail size={17} /></span><div><small>Email address</small><strong>{profile.email}</strong></div></div>
            <div><span className="profile-detail-icon"><ShieldCheck size={17} /></span><div><small>Role in school</small><strong>{schoolRole || 'Not specified'}</strong></div></div>
            <div><span className="profile-detail-icon"><Building2 size={17} /></span><div><small>System access</small><strong className="capitalize">{profile.role}</strong></div></div>
          </div>
        </article>

        <aside className="dp-card profile-account-card">
          <span className="dp-kicker">Account details</span>
          <h2>School membership</h2>
          <div><CalendarDays size={17} /><span>Member since</span><strong>{joined}</strong></div>
          <div><CheckCircle2 size={17} /><span>Profile status</span><strong className="profile-complete">Complete</strong></div>
          <div><ShieldCheck size={17} /><span>Account security</span><strong>Google protected</strong></div>
        </aside>
      </section>

      {profile.schoolRole === 'Teacher' && (
        <article className="dp-card profile-assignments-card">
          <div className="dp-section-head">
            <div><span className="dp-kicker">Teaching information</span><h2>Subjects and classes</h2></div>
            <span className="dp-chip blue">{profile.teachingAssignments?.length || 0} subjects</span>
          </div>
          {profile.teachingAssignments?.length ? (
            <div className="profile-assignment-grid">
              {profile.teachingAssignments.map((assignment, index) => (
                <div key={assignment.subject}>
                  <span className={`profile-subject-icon tone-${(index % 4) + 1}`}><BookOpen size={19} /></span>
                  <div><strong>{assignment.subject}</strong><span>{assignment.classes.join(' · ')}</span></div>
                </div>
              ))}
            </div>
          ) : <p className="profile-empty">No teaching assignments have been added yet.</p>}
        </article>
      )}

      <section className="profile-edit-section">
        <div><h2>Need to update something?</h2><p>You can change your name, school role, subjects and class assignments.</p></div>
        <button className="dp-btn dp-btn-primary" onClick={() => setEditing(true)}><Edit3 size={17} /> Edit profile</button>
      </section>
    </div>
  );
}
