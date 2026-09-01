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
  QrCode, 
  Calendar, 
  Bell, 
  LogOut, 
  ShieldCheck, 
  FileSpreadsheet,
  GraduationCap
} from 'lucide-react';

// Components
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import ProfileForm from './components/ProfileForm';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfileSetupDismissed, setIsProfileSetupDismissed] = useState(false);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen">
        <div className="p-8 flex items-center gap-3">
          <img src="/guide-academy-logo.png" alt="The Guide Academy logo" className="w-11 h-11 object-contain" />
          <span className="text-xl font-bold tracking-tight text-slate-900 font-display">THE GUIDE ACADEMY</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-3 font-semibold cursor-default">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </div>
          {/* Placeholder nav items for aesthetic consistency with theme */}
          <div className="p-3 text-slate-400 rounded-xl flex items-center gap-3 font-medium cursor-not-allowed opacity-50">
            <Calendar className="w-5 h-5" />
            Schedules
          </div>
          <button onClick={() => setIsEditingProfile(true)} className="w-full p-3 text-slate-600 rounded-xl flex items-center gap-3 font-medium hover:bg-slate-50 transition-colors">
            <UserCircle className="w-5 h-5" />
            Profile
          </button>
          <div className="p-3 text-slate-400 rounded-xl flex items-center gap-3 font-medium cursor-not-allowed opacity-50">
            <Bell className="w-5 h-5" />
            Notifications
          </div>
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {profile?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate uppercase tracking-wider">{profile?.name}</p>
              <p className="text-[10px] text-slate-500 font-medium capitalize">{profile?.role}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setIsEditingProfile(true)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors" aria-label="Edit profile"><UserCircle className="w-4 h-4" /></button>
              <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" aria-label="Sign out"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Nav */}
      <nav className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img src="/guide-academy-logo.png" alt="The Guide Academy logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg font-display">THE GUIDE ACADEMY</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsEditingProfile(true)} className="p-2 text-slate-400" aria-label="Edit profile"><UserCircle className="w-5 h-5" /></button>
          <button onClick={handleLogout} className="p-2 text-slate-400" aria-label="Sign out"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl">
        <AnimatePresence mode="wait">
          {profile?.role === 'admin' ? (
            <AdminDashboard profile={profile} />
          ) : (
            <TeacherDashboard profile={profile!} />
          )}
        </AnimatePresence>
      </main>

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

