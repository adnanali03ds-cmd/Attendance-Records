/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './lib/firebase';
import { UserProfile } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  UserCircle, 
  Bell, 
  LogOut, 
  ShieldCheck, 
  GraduationCap,
  Search,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

// Components
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProfileForm from './components/ProfileForm';
import './components/design-preview.css';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfileSetupDismissed, setIsProfileSetupDismissed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      setError(null);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // New user registration
            const isAdminEmail = firebaseUser.email === 'adnanali03.ds@gmail.com';
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Teacher',
              email: firebaseUser.email || '',
              role: isAdminEmail ? 'admin' : 'teacher', 
              profileCompleted: false,
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("Session failed. Please check your network or try logging in again.");
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          handleLogout();
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveProfile = async (fields: Pick<UserProfile, 'name' | 'schoolRole' | 'schoolRoleOther' | 'subjects' | 'classes' | 'teachingAssignments'>) => {
    if (!profile) return;
    const updatedProfile: UserProfile = { ...profile, ...fields, profileCompleted: true };
    await updateDoc(doc(db, 'users', profile.uid), {
      name: updatedProfile.name,
      schoolRole: updatedProfile.schoolRole,
      schoolRoleOther: updatedProfile.schoolRoleOther,
      subjects: updatedProfile.subjects,
      classes: updatedProfile.classes,
      teachingAssignments: updatedProfile.teachingAssignments,
      profileCompleted: true,
    });
    setProfile(updatedProfile);
  };

  const needsProfile = !!profile && (!profile.profileCompleted || !profile.schoolRole || !profile.name);

  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans tracking-tight">
        <motion.div 
          animate={{ opacity: [0.4, 1, 0.4] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">Initializing THE GUIDE ACADEMY</p>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full bg-white p-10 rounded-xl shadow-2xl shadow-slate-200/50 border border-slate-200 flex flex-col items-center text-center"
        >
          <img src="/guide-academy-logo.png" alt="The Guide Academy logo" className="w-20 h-20 object-contain mb-7" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight font-display">THE GUIDE ACADEMY</h1>
          <p className="text-slate-500 mb-10 text-sm font-medium leading-relaxed">Secure, QR-based attendance infrastructure for modern institutions.</p>
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 bg-white rounded-full p-0.5" />
            <span className="text-sm">Sign in with Google</span>
          </button>
          
          <div className="mt-12 flex flex-col items-center gap-4">
             <div className="h-px w-12 bg-slate-100"></div>
             <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Enterprise Ready</p>
          </div>
        </motion.div>
        <p className="mt-8 text-[10px] text-slate-400 font-medium max-w-xs text-center opacity-50">
          Authorized personnel only. All access attempts are logged for security and auditing purposes.
        </p>
      </div>
    );
  }

  return (
    <div className="design-preview live-app">
      <aside className={`dp-sidebar ${isMobileNavOpen ? 'open' : ''}`}>
        <div className="dp-brand">
          <img src="/guide-academy-logo.png" alt="The Guide Academy" />
          <div><strong>THE GUIDE</strong><span>ACADEMY</span></div>
          <button className="dp-mobile-close" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation"><X /></button>
        </div>
        <div className="dp-school-pill">
          <GraduationCap size={17} />
          <div><span>Academic year</span><strong>2026–27</strong></div>
          <ChevronDown size={15} />
        </div>
        <nav>
          <button className="active"><LayoutDashboard size={19} /><span>{profile?.role === 'admin' ? 'Admin workspace' : 'Dashboard'}</span></button>
          <button onClick={() => setIsEditingProfile(true)}><UserCircle size={19} /><span>My profile</span></button>
        </nav>
        <div className="dp-sidebar-help">
          <span className="dp-icon-box blue"><ShieldCheck size={18} /></span>
          <div><strong>Secure attendance</strong><p>Protected by Firebase.</p></div>
        </div>
        <div className="dp-user-card">
          <div className={`dp-avatar ${profile?.role === 'admin' ? 'blue' : 'violet'}`}>{profile?.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div><strong>{profile?.name}</strong><span>{profile?.email === 'adnanali03.ds@gmail.com' ? 'Permanent admin' : profile?.role}</span></div>
          <button onClick={handleLogout} title="Sign out" aria-label="Sign out"><LogOut size={17} /></button>
        </div>
      </aside>
      {isMobileNavOpen && <button className="dp-nav-scrim" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation" />}

      <div className="dp-content">
        <header className="dp-topbar">
          <button className="dp-menu-button" onClick={() => setIsMobileNavOpen(true)} aria-label="Open navigation"><Menu /></button>
          <div className="dp-search top"><Search size={17} /><input placeholder="Search your workspace…" readOnly /></div>
          <div className="dp-top-actions">
            <button className="dp-notification" aria-label="Notifications"><Bell size={19} /><i /></button>
            <button className="dp-top-profile" onClick={() => setIsEditingProfile(true)}>
              <div className={`dp-avatar ${profile?.role === 'admin' ? 'blue' : 'violet'}`}>{profile?.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div><strong>{profile?.name}</strong><span className="capitalize">{profile?.role}</span></div>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>
        <main className="dp-page">
          <AnimatePresence mode="wait">
            {profile?.role === 'admin' ? <AdminDashboard profile={profile} /> : <TeacherDashboard profile={profile!} />}
          </AnimatePresence>
        </main>
        <footer className="dp-footer"><span>© 2026 The Guide Academy</span><span>Secure attendance · Firebase protected</span></footer>
      </div>

      {((needsProfile && !isProfileSetupDismissed) || isEditingProfile) && profile && (
        <ProfileForm
          profile={profile}
          onSave={saveProfile}
          required={needsProfile}
          onClose={() => {
            setIsEditingProfile(false);
            if (needsProfile) setIsProfileSetupDismissed(true);
          }}
        />
      )}
    </div>
  );
}

