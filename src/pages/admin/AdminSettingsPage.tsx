import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { LogOut, ShieldCheck, UserPlus, KeyRound, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function AdminSettingsPage() {
  const { signOut, user, updatePassword } = useAuth();
  const { navigate } = useRouter();

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAdmin(true);
    setAdminError(null);
    setAdminSuccess(null);

    if (newAdminPassword.length < 6) {
      setAdminError('Password must be at least 6 characters.');
      setAddingAdmin(false);
      return;
    }

    try {
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await tempClient.auth.signUp({
        email: newAdminEmail.trim(),
        password: newAdminPassword,
      });

      if (error) throw error;

      if (data.user) {
        setAdminSuccess(`Admin account created for ${newAdminEmail.trim()}. They can now sign in.`);
        setNewAdminEmail('');
        setNewAdminPassword('');
      }
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Failed to create admin account.');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setChangingPassword(false);
      return;
    }

    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setPasswordSuccess('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Administrator account and preferences.</p>
      </div>

      {/* Current account */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-50">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Administrator Account</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Add Admin */}
      <div className="mt-4 card p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Add New Admin</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Create a new administrator account. The new admin will be able to sign in immediately.
        </p>

        {adminError && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{adminError}</div>
        )}
        {adminSuccess && (
          <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">{adminSuccess}</div>
        )}

        <form onSubmit={handleAddAdmin} className="space-y-3">
          <div>
            <label className="label-text">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                className="input-field pl-10"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@fellowship.org"
              />
            </div>
          </div>
          <div>
            <label className="label-text">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                className="input-field pl-10 pr-10"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={addingAdmin} className="btn-primary">
            <UserPlus className="h-4 w-4" />
            {addingAdmin ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="mt-4 card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="h-5 w-5 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Change Your Password</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Update your own admin password. You'll stay signed in after changing it.
        </p>

        {passwordError && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{passwordError}</div>
        )}
        {passwordSuccess && (
          <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">{passwordSuccess}</div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label-text">New Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field pl-10 pr-10"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label-text">Confirm New Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="input-field pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <button type="submit" disabled={changingPassword} className="btn-primary">
            <KeyRound className="h-4 w-4" />
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* About */}
      <div className="mt-4 card p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">About This Platform</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The Python Fellows Project Hub is an internal fellowship management platform.
          Administrators manage fellows, assign Python levels, generate balanced project groups,
          set group leaders, and update project topics. Fellows use the public site to find their
          group, teammates, and project information.
        </p>
      </div>
    </div>
  );
}
