import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Save, ArrowLeft, Image } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
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
        <div className="glass-strong p-6 rounded-3xl border border-[var(--border-color)] flex flex-col items-center justify-center text-center space-y-4">
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

        {/* Right Column: Profile Form */}
        <div className="md:col-span-2 glass-strong p-6 rounded-3xl border border-[var(--border-color)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            
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

            {/* Profile Photo URL */}
            <div className="space-y-2">
              <label htmlFor="profilePhoto" className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Profile Photo URL
              </label>
              <div className="relative flex items-center">
                <Image className="absolute left-3.5 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  id="profilePhoto"
                  type="text"
                  placeholder="Paste image URL (e.g. Unsplash, Cloudinary)"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
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

      </div>
    </div>
  );
};

export default ProfilePage;
