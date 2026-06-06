import React, { useState } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Mail, 
  Check,
  X,
  Save,
  Trophy,
  Edit,
  Volume2,
  VolumeX
} from 'lucide-react';
import { User } from '../types.ts';
import { playClickSound } from '../utils/sound.ts';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  user: User;
  feedbackEmail: string;
  onUpdateFeedbackEmail: (email: string) => Promise<void>;
  soundVolume: number;
  onSoundVolumeChange: (vol: number) => void;
}

export default function SettingsScreen({
  theme,
  onThemeToggle,
  user,
  feedbackEmail,
  onUpdateFeedbackEmail,
  soundVolume,
  onSoundVolumeChange
}: SettingsScreenProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(feedbackEmail);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(feedbackEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 md:py-16 text-left">
      <div className="bg-card border border-primary-border/60 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
        
        {/* Simple Title */}
        <div className="flex items-center gap-3 border-b border-primary-border pb-5">
          <div className="p-2.5 bg-[#E8472A]/10 rounded-xl">
            <Settings className="w-5 h-5 text-[#E8472A]" />
          </div>
          <div>
            <h1 className="font-display text-lg font-black tracking-wider uppercase text-primary">
              Settings
            </h1>
            <p className="font-sans text-[11px] text-secondary">
              Personalize your client preferences & get in touch.
            </p>
          </div>
        </div>

        {/* Theme Preferences option */}
        <div className="p-5 rounded-2xl bg-secondary-surface/40 border border-primary-border/40 flex items-center justify-between">
          <div>
            <span className="font-sans font-bold text-sm text-primary block">
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <span className="font-sans text-[11px] text-secondary">
              Adjust the color format of the app
            </span>
          </div>

          <button
            onClick={onThemeToggle}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-neutral-800 border-zinc-700 flex items-center"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                theme === 'dark' ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {theme === 'dark' ? (
                <Sun className="w-3 h-3 text-[#E8472A]" />
              ) : (
                <Moon className="w-3 h-3 text-zinc-600" />
              )}
            </span>
          </button>
        </div>

        {/* Sound Preferences Section */}
        <div className="p-5 rounded-2xl bg-secondary-surface/40 border border-primary-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-sans font-bold text-sm text-primary block">
                Sound Effects
              </span>
              <span className="font-sans text-[11px] text-secondary">
                Toggle and adjust clicks and level up chimes
              </span>
            </div>

            <button
              onClick={() => {
                const nextVol = soundVolume > 0 ? 0 : 0.5;
                onSoundVolumeChange(nextVol);
                if (nextVol > 0) {
                  playClickSound(nextVol);
                }
              }}
              className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                soundVolume > 0
                  ? 'bg-[#E8472A]/10 text-[#E8472A] border-[#E8472A]/35 hover:bg-[#E8472A]/20'
                  : 'bg-zinc-805 text-zinc-500 border-zinc-700/50 hover:bg-zinc-800/60'
              }`}
              title={soundVolume > 0 ? 'Mute' : 'Unmute'}
            >
              {soundVolume > 0 ? (
                <Volume2 className="w-4 h-4 text-[#E8472A]" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 bg-zinc-950/40 border border-primary-border/20 p-3.5 rounded-xl">
            <span className="font-mono text-[10px] text-zinc-500 w-8 shrink-0">
              {Math.round(soundVolume * 100)}%
            </span>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onSoundVolumeChange(val);
              }}
              onMouseUp={() => {
                if (soundVolume > 0) {
                  playClickSound(soundVolume);
                }
              }}
              onTouchEnd={() => {
                if (soundVolume > 0) {
                  playClickSound(soundVolume);
                }
              }}
              className="flex-1 accent-[#E8472A] cursor-ew-resize opacity-90 hover:opacity-100 transition-opacity bg-zinc-800 h-1.5 rounded-lg appearance-none"
            />
            
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const nextVol = Math.max(0, parseFloat((soundVolume - 0.1).toFixed(2)));
                  onSoundVolumeChange(nextVol);
                  if (nextVol > 0) playClickSound(nextVol);
                }}
                className="px-2 py-1 bg-zinc-800/40 text-xs font-bold rounded-lg hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 active:scale-95 transition-all outline-none cursor-pointer"
              >
                -
              </button>
              <button
                onClick={() => {
                  const nextVol = Math.sin(Math.min(1, parseFloat((soundVolume + 0.1).toFixed(2))));
                  const exactNext = Math.min(1, parseFloat((soundVolume + 0.1).toFixed(2)));
                  onSoundVolumeChange(exactNext);
                  if (exactNext > 0) playClickSound(exactNext);
                }}
                className="px-2 py-1 bg-zinc-800/40 text-xs font-bold rounded-lg hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 active:scale-95 transition-all outline-none cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="p-5 rounded-2xl bg-gradient-to-tr from-zinc-950 to-zinc-900 border border-primary-border/50 space-y-4 relative overflow-hidden">
          {/* Subtle design flare */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8472A]/5 blur-3xl pointer-events-none rounded-full" />
          
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="font-display font-black text-xs text-[#E8472A] uppercase tracking-wider mb-1 flex items-center gap-1.5 leading-none">
                <span>Feedback & Suggestions</span>
                {user?.isAdmin && (
                  <span className="bg-amber-500/10 text-amber-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-amber-500/20 font-bold uppercase tracking-widest leading-none">
                    ADMIN
                  </span>
                )}
              </h3>
              <p className="font-sans text-xs text-zinc-300 leading-relaxed mt-1">
                Have feature requests, comments, or bug reports? We'd love to hear from you! Please reach out to us:
              </p>
            </div>
            
            {user?.isAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setNewEmail(feedbackEmail);
                  setErrorMsg('');
                  setSuccessMsg('');
                  setIsEditing(true);
                }}
                className="p-1.5 md:p-2 text-zinc-400 hover:text-amber-400 hover:bg-white/5 rounded-lg border border-white/5 bg-zinc-900/40 transition-all flex items-center gap-1 cursor-pointer shrink-0 text-[10px] font-mono uppercase tracking-wider"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                setErrorMsg('');
                setSuccessMsg('');
                
                const trimmed = newEmail.trim();
                if (!trimmed) {
                  setErrorMsg('Email cannot be empty.');
                  return;
                }
                if (!validateEmail(trimmed)) {
                  setErrorMsg('Please enter a valid email address.');
                  return;
                }
                
                try {
                  await onUpdateFeedbackEmail(trimmed);
                  setSuccessMsg('Feedback email updated successfully!');
                  setTimeout(() => {
                    setIsEditing(false);
                    setSuccessMsg('');
                  }, 2000);
                } catch (err) {
                  setErrorMsg('Failed to update email. Please try again.');
                }
              }}
              className="space-y-3 bg-black/40 border border-white/5 rounded-xl p-4 text-left relative z-10"
            >
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-[9px] text-zinc-400 uppercase tracking-widest font-black">
                  EDIT FEEDBACK RECEIVER EMAIL
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter support email address"
                  className="w-full bg-zinc-950/80 border border-white/10 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#E8472A] font-mono tracking-wide placeholder-zinc-600"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div className="text-[10px] text-rose-500 font-mono font-bold flex items-center gap-1.5 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  <X className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 font-sans text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="bg-amber-400 text-zinc-950 hover:bg-amber-300 font-sans text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Email</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
              <div className="bg-black/60 border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between font-mono text-xs text-white block select-all flex-1 min-w-0">
                <span className="truncate">sent feedback us on {feedbackEmail}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="bg-white text-zinc-950 hover:bg-neutral-200 font-sans text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Mail className="w-4 h-4 text-zinc-850" />}
                <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
