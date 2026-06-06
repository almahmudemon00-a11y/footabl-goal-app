import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Mail, 
  Check,
  Edit,
  Save,
  X,
  Lock,
  Shield,
  Globe,
  Image as ImageIcon,
  RotateCcw,
  Loader2,
  Trophy
} from 'lucide-react';
import { User } from '../types.ts';
import { getDirectImageUrl } from '../utils.ts';

interface SettingsScreenProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  user: User;
  feedbackEmail: string;
  onUpdateFeedbackEmail: (email: string) => Promise<void>;
  faviconUrl: string;
  logoUrl: string;
  onUpdateBranding: (faviconUrl: string, logoUrl: string) => Promise<void>;
}

export default function SettingsScreen({
  theme,
  onThemeToggle,
  user,
  feedbackEmail,
  onUpdateFeedbackEmail,
  faviconUrl,
  logoUrl,
  onUpdateBranding
}: SettingsScreenProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(feedbackEmail);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Branding Management states
  const [inputFavicon, setInputFavicon] = useState(faviconUrl);
  const [inputLogo, setInputLogo] = useState(logoUrl);
  
  const [faviconLoadError, setFaviconLoadError] = useState('');
  const [logoLoadError, setLogoLoadError] = useState('');
  const [testingFavicon, setTestingFavicon] = useState(false);
  const [testingLogo, setTestingLogo] = useState(false);
  const [isFaviconLoadable, setIsFaviconLoadable] = useState(false);
  const [isLogoLoadable, setIsLogoLoadable] = useState(false);

  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSuccessMsg, setBrandingSuccessMsg] = useState('');
  const [brandingErrorMsg, setBrandingErrorMsg] = useState('');

  // Reset inputs when prop values change (e.g. synced in from firebase onSnapshot)
  useEffect(() => {
    setInputFavicon(faviconUrl);
  }, [faviconUrl]);

  useEffect(() => {
    setInputLogo(logoUrl);
  }, [logoUrl]);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(feedbackEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Helper utility to test if image loads
  const testImageLoad = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url.trim()) {
        resolve(false);
        return;
      }
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  // Validate format and test load live (Extension parameters bypassed entirely)
  const validateAndTestFavicon = async (url: string) => {
    setFaviconLoadError('');
    setIsFaviconLoadable(false);
    if (!url.trim()) {
      return;
    }

    const transformedUrl = getDirectImageUrl(url);
    if (!transformedUrl.startsWith('http://') && !transformedUrl.startsWith('https://')) {
      setFaviconLoadError('Address must start with http:// or https://');
      return;
    }

    setTestingFavicon(true);
    const loadable = await testImageLoad(transformedUrl);
    setTestingFavicon(false);

    if (loadable) {
      setIsFaviconLoadable(true);
    } else {
      setFaviconLoadError('Failed to load image. Ensure it is a valid public image URL or public sharing Google Drive file.');
    }
  };

  const validateAndTestLogo = async (url: string) => {
    setLogoLoadError('');
    setIsLogoLoadable(false);
    if (!url.trim()) {
      return;
    }

    const transformedUrl = getDirectImageUrl(url);
    if (!transformedUrl.startsWith('http://') && !transformedUrl.startsWith('https://')) {
      setLogoLoadError('Address must start with http:// or https://');
      return;
    }

    setTestingLogo(true);
    const loadable = await testImageLoad(transformedUrl);
    setTestingLogo(false);

    if (loadable) {
      setIsLogoLoadable(true);
    } else {
      setLogoLoadError('Failed to load image. Ensure it is a valid public image URL or public sharing Google Drive file.');
    }
  };

  // Trigger preview analysis on changes with real-time conversion
  useEffect(() => {
    const timer = setTimeout(() => {
      const transformed = getDirectImageUrl(inputFavicon);
      if (transformed !== inputFavicon) {
        setInputFavicon(transformed);
      } else {
        validateAndTestFavicon(inputFavicon);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputFavicon]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const transformed = getDirectImageUrl(inputLogo);
      if (transformed !== inputLogo) {
        setInputLogo(transformed);
      } else {
        validateAndTestLogo(inputLogo);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputLogo]);

  // Branding Submit Handler
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.isAdmin) return;

    setBrandingErrorMsg('');
    setBrandingSuccessMsg('');
    setIsSavingBranding(true);

    const fUrl = getDirectImageUrl(inputFavicon.trim());
    const lUrl = getDirectImageUrl(inputLogo.trim());

    // Verify values before writing - bypassing extension checks entirely as requested
    if (fUrl) {
      if (!fUrl.startsWith('http://') && !fUrl.startsWith('https://')) {
        setBrandingErrorMsg('Favicon URL has validation errors. Address must start with http:// or https://');
        setIsSavingBranding(false);
        return;
      }
      const loadable = await testImageLoad(fUrl);
      if (!loadable) {
        setBrandingErrorMsg('Unable to load favicon image. Please ensure the Google Drive file is shared publicly as "Anyone with the link can view".');
        setIsSavingBranding(false);
        return;
      }
    }

    if (lUrl) {
      if (!lUrl.startsWith('http://') && !lUrl.startsWith('https://')) {
        setBrandingErrorMsg('Logo URL has validation errors. Address must start with http:// or https://');
        setIsSavingBranding(false);
        return;
      }
      const loadable = await testImageLoad(lUrl);
      if (!loadable) {
        setBrandingErrorMsg('Unable to load logo image. Please ensure the Google Drive file is shared publicly as "Anyone with the link can view".');
        setIsSavingBranding(false);
        return;
      }
    }

    try {
      await onUpdateBranding(fUrl, lUrl);
      setBrandingSuccessMsg('Dynamic Branding and Logo configuration updated successfully!');
      setTimeout(() => setBrandingSuccessMsg(''), 5000);
    } catch (err) {
      setBrandingErrorMsg('Failed to update branding settings. Please try again.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Reset to default Handler
  const handleResetBranding = async () => {
    if (!user?.isAdmin) return;
    if (window.confirm('Are you sure you want to restore the default GoalSpire logo and favicon?')) {
      setInputFavicon('');
      setInputLogo('');
      setFaviconLoadError('');
      setLogoLoadError('');
      setIsFaviconLoadable(false);
      setIsLogoLoadable(false);
      setBrandingErrorMsg('');
      setBrandingSuccessMsg('');
      
      setIsSavingBranding(true);
      try {
        await onUpdateBranding('', '');
        setBrandingSuccessMsg('Branding restored to GoalSpire defaults successfully!');
        setTimeout(() => setBrandingSuccessMsg(''), 4000);
      } catch (err) {
        setBrandingErrorMsg('Failed to reset branding. Please try again.');
      } finally {
        setIsSavingBranding(false);
      }
    }
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

        {/* ADMIN LOGO & BRANDING MANAGEMENT SECTION */}
        {user?.isAdmin && (
          <div className="border-t border-primary-border/60 pt-8 space-y-8">
            {/* Header Badge & Title Banner */}
            <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/5 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-48 h-48 bg-[#E8472A]/5 blur-3xl pointer-events-none rounded-full" />
              <div className="flex items-start gap-4 z-10 relative">
                <div className="p-3 bg-[#E8472A]/10 border border-[#E8472A]/20 rounded-xl shrink-0">
                  <Shield className="w-5 h-5 text-[#E8472A] animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-black tracking-widest uppercase text-primary">
                      Admin Settings → Branding
                    </h3>
                    <span className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400 text-[9px] font-mono px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase tracking-widest">
                      System Console
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-zinc-400 mt-1.5 leading-relaxed max-w-lg">
                    Rebrand the entire platform layout, favicon graphic, and headers instantly. Input any public Google Drive sharing link; our engine cleans, parses, and translates it into a high-availability direct CDN asset.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TAB ICON / FAVICON CARD */}
                <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-all duration-300">
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] text-[#E8472A] uppercase tracking-widest font-black flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Favicon Link</span>
                    </label>
                    <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                      This icon represents the game in the browser tab, bookmarks bar, and shortcut indicators.
                    </p>
                    <input
                      type="url"
                      value={inputFavicon}
                      onChange={(e) => setInputFavicon(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view?usp=drive_link"
                      className="w-full bg-zinc-950 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#E8472A] font-mono tracking-wide placeholder-zinc-650 transition-all shadow-inner"
                    />
                  </div>

                  <div className="pt-2 min-h-[36px] flex items-center">
                    {testingFavicon && (
                      <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Validating favicon compatibility...</span>
                      </div>
                    )}
                    {faviconLoadError ? (
                      <div className="text-[10px] text-rose-400 font-mono font-medium bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/20 w-full flex items-start gap-1.5">
                        <span className="shrink-0">⚠️</span>
                        <span>{faviconLoadError}</span>
                      </div>
                    ) : (
                      inputFavicon && isFaviconLoadable && (
                        <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Favicon verified & secure!</span>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* GAME LOGO CARD */}
                <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-4 hover:border-white/10 transition-all duration-300">
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] text-[#E8472A] uppercase tracking-widest font-black flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Game Logo Link</span>
                    </label>
                    <p className="text-[10px] text-zinc-500 font-sans leading-relaxed">
                      Replaces the header, login card, loading layouts, and sidebar headers across the entire platform.
                    </p>
                    <input
                      type="url"
                      value={inputLogo}
                      onChange={(e) => setInputLogo(e.target.value)}
                      placeholder="https://drive.google.com/file/d/.../view?usp=drive_link"
                      className="w-full bg-zinc-950 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#E8472A] font-mono tracking-wide placeholder-zinc-650 transition-all shadow-inner"
                    />
                  </div>

                  <div className="pt-2 min-h-[36px] flex items-center">
                    {testingLogo && (
                      <div className="text-[10px] text-amber-400 font-mono flex items-center gap-1.5 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/10">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying image render pipeline...</span>
                      </div>
                    )}
                    {logoLoadError ? (
                      <div className="text-[10px] text-rose-400 font-mono font-medium bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/20 w-full flex items-start gap-1.5">
                        <span className="shrink-0">⚠️</span>
                        <span>{logoLoadError}</span>
                      </div>
                    ) : (
                      inputLogo && isLogoLoadable && (
                        <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1.5 bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/15">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Game logo verified & loadable!</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* REAL-TIME PREVIEW SYSTEM */}
              <div className="p-5 bg-zinc-950/80 border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Real-Time Preview Mockups</span>
                  </span>
                  <span className="text-[8px] font-mono text-zinc-600 uppercase">Interactive Viewports</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Browser Tab Favicon Preview */}
                  <div className="bg-[#0f0f13] border border-white/5 rounded-xl p-4 flex flex-col justify-between min-h-[160px] relative hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Browser Tab Environment</span>
                      <span className="text-[8px] bg-zinc-900 border border-white/10 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono">Safari / Chrome</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center py-3">
                      {/* Realistic Tabbar container mockup */}
                      <div className="w-full max-w-[240px] bg-[#1a1a24] rounded-lg border border-white/10 overflow-hidden shadow-2xl">
                        {/* Browser fake upper control dots */}
                        <div className="flex items-center gap-1 px-3 py-2 bg-[#121218] border-b border-black/30">
                          <div className="w-2 h-2 rounded-full bg-rose-500/60" />
                          <div className="w-2 h-2 rounded-full bg-amber-500/60" />
                          <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                        </div>
                        {/* Tab pill */}
                        <div className="p-2 flex items-center justify-center">
                          <div className="bg-[#1c1c28] rounded-md px-3 py-1.5 border border-white/5 flex items-center gap-2 max-w-[180px] shadow-md">
                            <div className="w-4 h-4 rounded overflow-hidden flex items-center justify-center bg-zinc-900/80 border border-white/10 shrink-0">
                              {inputFavicon && isFaviconLoadable ? (
                                <img src={inputFavicon} alt="Favicon preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[9px]">⚽</span>
                              )}
                            </div>
                            <span className="text-[10px] font-sans font-medium text-zinc-350 truncate select-none leading-none">GoalSpire | Play</span>
                            <X className="w-2.5 h-2.5 text-zinc-500 shrink-0 select-none hover:text-zinc-300 cursor-pointer" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-zinc-500 text-center mt-3">
                      {inputFavicon && isFaviconLoadable ? (
                        <span className="text-emerald-400/80">Active dynamic favicon mapping active</span>
                      ) : (
                        <span>Showing fallback GoalSpire default soccer icon</span>
                      )}
                    </div>
                  </div>

                  {/* Header Logo Navbar Preview */}
                  <div className="bg-[#0f0f13] border border-white/5 rounded-xl p-4 flex flex-col justify-between min-h-[160px] relative hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-4">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Navigation Bar Layout</span>
                      <span className="text-[8px] bg-zinc-900 border border-white/10 text-zinc-500 px-1.5 py-0.5 rounded uppercase font-mono">Header View</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center py-3">
                      {/* Realistic Navbar bar mockup */}
                      <div className="w-full max-w-[240px] bg-[#14141e] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                        <div className="px-3 py-2.5 flex items-center justify-between border-b border-white/5 bg-[#171724]">
                          {inputLogo && isLogoLoadable ? (
                            <img src={inputLogo} alt="Logo preview" className="h-5 w-auto object-contain max-w-[100px]" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex items-center gap-1 shrink-0">
                              <div className="w-4 h-4 rounded bg-[#E8472A] flex items-center justify-center text-white text-[7px] shadow-sm">
                                <Trophy className="w-2.5 h-2.5 text-white" />
                              </div>
                              <span className="font-display text-[9px] font-black tracking-tighter text-white">
                                GoalSpire
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-650" />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-650" />
                            <div className="w-4 h-4 rounded-full bg-zinc-700" />
                          </div>
                        </div>
                        <div className="p-3 text-center">
                          <span className="text-[8px] font-mono text-zinc-500">Live Navbar environment mockup</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-zinc-500 text-center mt-3">
                      {inputLogo && isLogoLoadable ? (
                        <span className="text-emerald-400/80">Active dynamic site logo graphic loaded</span>
                      ) : (
                        <span>Showing fallback GoalSpire dynamic text branding</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* SUBMISSION STATE FEEDBACKS */}
              {brandingErrorMsg && (
                <div className="text-xs text-rose-400 font-mono font-medium flex items-start gap-2.5 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 shadow-lg">
                  <X className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <h5 className="font-bold uppercase text-rose-300 text-[10px] tracking-wider mb-1">Branding Save Error</h5>
                    <p className="text-[11px] text-rose-300/95 leading-relaxed">{brandingErrorMsg}</p>
                  </div>
                </div>
              )}

              {brandingSuccessMsg && (
                <div className="text-xs text-emerald-400 font-mono font-medium flex items-start gap-2.5 bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 shadow-lg">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div>
                    <h5 className="font-bold uppercase text-emerald-300 text-[10px] tracking-wider mb-1">Configuration Synced</h5>
                    <p className="text-[11px] text-emerald-300/95 leading-relaxed">{brandingSuccessMsg}</p>
                  </div>
                </div>
              )}

              {/* SAVE / RESET CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div>
                  {(faviconUrl || logoUrl || inputFavicon || inputLogo) && (
                    <button
                      type="button"
                      onClick={handleResetBranding}
                      disabled={isSavingBranding}
                      className="bg-zinc-950 hover:bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-450 hover:text-zinc-200 font-sans text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 focus:outline-none"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Defaults</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingBranding || (inputFavicon !== '' && !isFaviconLoadable && !faviconLoadError) || (inputLogo !== '' && !isLogoLoadable && !logoLoadError)}
                  className="bg-amber-400 text-zinc-950 hover:bg-amber-300 disabled:opacity-50 disabled:hover:bg-amber-400 font-sans text-xs font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 select-none shadow-md focus:outline-none active:scale-[0.98]"
                >
                  {isSavingBranding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving branding...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Branding changes</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
