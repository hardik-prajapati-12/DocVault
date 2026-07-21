import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Save, ArrowLeft, Image, Key, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  
  // Profile settings state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Load current user profile from localStorage
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('docvault-auth-user');
      if (rawUser) {
        const user = JSON.parse(rawUser);
        setUsername(user.username || '');
        setEmail(user.email || '');
        setProfilePhoto(user.profilePhoto || '');
      }
    } catch (e) {
      console.error('Failed to load user info:', e);
    }
  }, []);

  // Compute initials for avatar fallback (only first character)
  const userInitials = useMemo(() => {
    if (!username) return '?';
    return username.trim().slice(0, 1).toUpperCase();
  }, [username]);

  // Handle local photo selection and convert to Base64
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim()) {
      toast.error('Username and email are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid original email address');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('docvault-auth-token');

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          profilePhoto: profilePhoto.trim() || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to update profile');
        setLoading(false);
        return;
      }

      // Update localStorage with updated user details
      localStorage.setItem('docvault-auth-user', JSON.stringify(data.user));
      toast.success('Profile updated successfully!');
      
      // Auto reload after short delay to update global header elements
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    const token = localStorage.getItem('docvault-auth-token');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to change password');
        setPasswordLoading(false);
        return;
      }

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Profile Settings</h1>
            <p className="text-xs text-[var(--text-tertiary)]">Manage your account profile and credentials</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar Preview */}
        <div className="h-fit glass-strong p-6 rounded-3xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative group">
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={username}
                className="w-28 h-28 rounded-full object-cover border-4 border-[var(--accent)] shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-white text-4xl font-extrabold border-4 border-[var(--accent)]/30 shadow-xl">
                {userInitials}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">{username || 'User'}</h3>
            <p className="text-xs text-[var(--text-tertiary)]">{email || 'No email set'}</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Verified Profile
          </div>
        </div>

        {/* Right Column: Forms list */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Card 1: Profile Info Form */}
          <div className="glass-strong p-6 rounded-3xl border border-[var(--border-color)]">
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              
              <h2 className="text-base font-extrabold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-[var(--accent)]" />
                Personal Information
              </h2>

              {/* Username */}
              <div className="space-y-2">
                <label htmlFor="username" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Username
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Profile Photo Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Preview"
                      className="w-14 h-14 rounded-full object-cover border-2 border-[var(--accent)]"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-purple-600 flex items-center justify-center text-white font-extrabold text-lg">
                      {userInitials}
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      id="photo-picker"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-picker"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
                    >
                      <Image className="w-4 h-4" />
                      Choose Device Photo
                    </label>
                    {profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setProfilePhoto('')}
                        className="ml-3 text-xs font-semibold text-red-400 hover:text-red-300 hover:underline cursor-pointer"
                      >
                        Remove Photo
                      </button>
                    )}
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1.5">Max size: 2MB. Supports PNG, JPG, WebP.</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto btn-accent flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>

            </form>
          </div>

          {/* Card 2: Change Password Form */}
          <div className="glass-strong p-6 rounded-3xl border border-[var(--border-color)]">
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              
              <h2 className="text-base font-extrabold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                <Key className="w-4.5 h-4.5 text-[var(--accent)]" />
                Change Password
              </h2>

              {/* Current Password */}
              <div className="space-y-2">
                <label htmlFor="currentPassword" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Confirm New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full sm:w-auto btn-accent flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  {passwordLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>

            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProfilePage;
