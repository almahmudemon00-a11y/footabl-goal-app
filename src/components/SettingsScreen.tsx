import React, { useState } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Mail, 
  Check
} from 'lucide-react';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export default function SettingsScreen({
  theme,
  onThemeToggle
}: SettingsScreenProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('almagdjsg@gmail.com');
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

        {/* Feedback Section */}
        <div className="p-5 rounded-2xl bg-gradient-to-tr from-zinc-950 to-zinc-900 border border-primary-border/50 space-y-4">
          <div>
            <h3 className="font-display font-black text-xs text-[#E8472A] uppercase tracking-wider mb-1">
              Feedback & Suggestions
            </h3>
            <p className="font-sans text-xs text-zinc-300 leading-relaxed">
              Have feature requests, comments, or bug reports? We'd love to hear from you! Please reach out to us:
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <div className="bg-black/60 border border-white/5 rounded-xl px-4 py-2.5 flex items-center justify-between font-mono text-xs text-white block select-all flex-1 min-w-0">
              <span className="truncate">sent feedback us on almagdjsg@gmail.com</span>
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="bg-white text-zinc-950 hover:bg-neutral-200 font-sans text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {copiedEmail ? <Check className="w-4 h-4 text-emerald-500" /> : <Mail className="w-4 h-4 text-zinc-800" />}
              <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
