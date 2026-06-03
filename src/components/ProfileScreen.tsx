/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Sparkles, LogIn, LogOut, Edit2, MessageSquare, Flame, Search, ArrowLeft } from 'lucide-react';
import { User, UserStats, Comment } from '../types.ts';
import { PRE_SEEDED_COMMENTS } from '../data.ts';

interface ProfileScreenProps {
  user: User;
  stats: UserStats;
  comments: Record<string, Comment[]>;
  onLogin: () => void;
  onLogout: () => void;
  onUpdateUsername: (newUsername: string) => Promise<boolean>;
  checkIfUsernameTaken: (usernameToCheck: string, excludeUid: string | null) => Promise<boolean>;
  searchUserByUsername: (username: string) => Promise<{ searchedUser: User; searchedStats: UserStats } | null>;
}

export default function ProfileScreen({
  user,
  stats,
  comments,
  onLogin,
  onLogout,
  onUpdateUsername,
  checkIfUsernameTaken,
  searchUserByUsername
}: ProfileScreenProps) {
  // Tabs inside Profile: 'stats' or 'my-comments'
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'comments'>('stats');

  // Search query states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<{ user: User; stats: UserStats } | null>(null);

  // Active user / stats mapping for rendering
  const activeUser = viewedProfile ? viewedProfile.user : user;
  const activeStats = viewedProfile ? viewedProfile.stats : stats;

  // Claim username modal flow
  const [showClaimModal, setShowClaimModal] = useState<boolean>(false);
  const [claimedUsernameInput, setClaimedUsernameInput] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Edit username inputs (inside logged in)
  const [isEditingUsername, setIsEditingUsername] = useState<boolean>(false);
  const [editInputVal, setEditInputVal] = useState<string>(user.username || '');
  const [editError, setEditError] = useState<string | null>(null);

  // Taken username popup state
  const [popupAlert, setPopupAlert] = useState<{ message: string } | null>(null);

  // Handler for Profile Search
  const handleSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchError('Please fill in a username to search.');
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const result = await searchUserByUsername(trimmed);
      if (result) {
        setViewedProfile({ user: result.searchedUser, stats: result.searchedStats });
        setSearchError(null);
      } else {
        setSearchError(`No player found with the username "${trimmed}".`);
      }
    } catch (e) {
      setSearchError('Something went wrong during the search query.');
    } finally {
      setIsSearching(false);
    }
  };

  // Extract all comments posted by this user/activeUser
  const userCommentsList = useMemo(() => {
    const list: { charId: string; commentText: string; timestamp: number; upvotes: number }[] = [];
    
    // Check local live comments state
    Object.entries(comments).forEach(([charId, listComments]) => {
      listComments.forEach(c => {
        if (c.userId === activeUser.guestId || c.userId === activeUser.uid || (activeUser.username && c.username === activeUser.username)) {
          list.push({
            charId,
            commentText: c.text,
            timestamp: c.timestamp,
            upvotes: c.upvotes,
          });
        }
      });
    });

    // Fallback to pre-seeded ones if comments contains none
    Object.entries(PRE_SEEDED_COMMENTS).forEach(([charId, preComments]) => {
      preComments.forEach(c => {
        if (c.userId === activeUser.guestId || c.userId === activeUser.uid || (activeUser.username && c.username === activeUser.username)) {
          const alreadyAdded = list.some(item => item.charId === charId && item.commentText === c.text);
          if (!alreadyAdded) {
            list.push({
              charId,
              commentText: c.text,
              timestamp: c.timestamp,
              upvotes: c.upvotes,
            });
          }
        }
      });
    });

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [comments, activeUser]);

  // Validation rules
  const validateUsername = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setUsernameError('Username cannot be empty.');
      return false;
    }
    if (trimmed.length < 3 || trimmed.length > 20) {
      setUsernameError('Must be between 3 and 20 characters.');
      return false;
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(trimmed)) {
      setUsernameError('Only letters, numbers, and underscores are allowed.');
      return false;
    }
    setUsernameError(null);
    return true;
  };

  // Launch Google Authenticator Simulator
  const triggerGoogleLoginSimulator = () => {
    // Generate a reasonable random username suggestion
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setClaimedUsernameInput(`Striker_No9_${randomSuffix}`);
    setUsernameError(null);
    setShowClaimModal(true);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateUsername(claimedUsernameInput)) {
      const trimmed = claimedUsernameInput.trim();
      const isTaken = await checkIfUsernameTaken(trimmed, null);
      if (isTaken) {
        setPopupAlert({ message: `The username "${trimmed}" is already taken. Please choose a different handle.` });
        return;
      }
      localStorage.setItem('pending_claimed_username', trimmed);
      onLogin();
      setShowClaimModal(false);
    }
  };

  const handleUpdateUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editInputVal.trim();
    
    // Validate formatting locally
    if (cleanName.length < 3 || cleanName.length > 20) {
      setEditError('Length must be between 3 and 20 characters.');
      return;
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(cleanName)) {
      setEditError('Only letters, numbers, and underscores allowed.');
      return;
    }

    const ok = await onUpdateUsername(cleanName);
    if (ok) {
      setEditError(null);
      setIsEditingUsername(false);
    } else {
      setEditError('This username is already taken.');
      setPopupAlert({ message: `The username "${cleanName}" is already taken. Please choose a different handle.` });
    }
  };

  // Accuracy calculation helper
  const accuracyPercentage = useMemo(() => {
    if (activeStats.totalGuesses === 0) return 0;
    return Math.round((activeStats.correctGuesses / activeStats.totalGuesses) * 100);
  }, [activeStats]);

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-4xl mx-auto flex flex-col justify-between">
      
      <div>
        {/* Dynamic Search Bar Hub */}
        <div className="bg-[#111115] border border-primary-border/60 p-4 md:p-5 rounded-2xl shadow-lg mb-6 text-left">
          <h3 className="font-display font-bold text-xs tracking-wider uppercase text-zinc-400 mb-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#E8472A]" />
            <span>Search Player Statistics</span>
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter precise username (e.g. striker_99)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="flex-1 bg-secondary-surface border border-primary-border/60 rounded-xl px-4 py-2.5 text-xs text-primary focus:outline-none focus:border-[#E8472A] transition-all font-mono"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-sans font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm border border-zinc-700"
            >
              {isSearching ? 'Querying...' : 'Search'}
            </button>
          </div>
          {searchError && (
            <p className="text-[11px] text-red font-semibold mt-2.5 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{searchError}</span>
            </p>
          )}

          {viewedProfile && (
            <div className="mt-3 flex items-center justify-between border-t border-primary-border/30 pt-3">
              <p className="font-sans text-[11px] text-amber-500/90 font-bold flex items-center gap-1">
                <span>⚠️ Viewing read-only player profile: </span>
                <span className="font-mono text-white bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  @{viewedProfile.user.username}
                </span>
              </p>
              <button
                onClick={() => {
                  setViewedProfile(null);
                  setSearchQuery('');
                  setSearchError(null);
                }}
                className="flex items-center gap-1 text-[11px] text-[#E8472A] hover:underline font-bold font-sans cursor-pointer bg-transparent border-none"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to My Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Card Hub */}
        <div className="bg-card rounded-3xl border border-primary-border p-6 md:p-8 relative overflow-hidden shadow-xl mb-8">
          
          {/* Accent decoration glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#E8472A]/5 blur-3xl rounded-full" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-primary-border/40">
            {/* User Profile Details */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-secondary-surface border-2 border-[#E8472A] flex items-center justify-center text-primary font-display font-bold text-2xl relative shadow-md">
                {activeUser.avatar ? (
                  <span className="text-3xl select-none">{activeUser.avatar}</span>
                ) : (
                  <span className="text-secondary select-none">🏆</span>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#E8472A] border-2 border-card flex items-center justify-center text-[10px] text-white">
                  {activeUser.isGuest ? 'G' : '✓'}
                </div>
              </div>

              <div className="text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl md:text-2xl text-primary font-bold">
                    {activeUser.username || activeUser.guestId}
                  </h2>
                  
                  {!activeUser.isGuest && (
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-green bg-green/10 px-2 py-0.5 rounded-full border border-green/15 font-sans">
                      VERIFIED
                    </span>
                  )}

                  {activeUser.isAdmin ? (
                    <span className="text-[9px] uppercase tracking-widest font-black text-[#E8472A] bg-[#E8472A]/15 px-2.5 py-0.5 rounded-full border border-[#E8472A]/30 flex items-center gap-1 font-sans shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8472A]" />
                      ADMIN
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400 bg-zinc-800/60 px-2.5 py-0.5 rounded-full border border-zinc-700/60 flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      USER
                    </span>
                  )}
                </div>
                <p className="font-sans text-xs text-secondary mt-1 flex items-center gap-1.5 text-left">
                  <span className={`w-2 h-2 rounded-full ${activeUser.isGuest ? 'bg-zinc-500 animate-pulse' : 'bg-[#E8472A]'}`} />
                  {activeUser.isGuest ? 'Playing as Guest Session' : 'Connected via Secure Firebase Service'}
                </p>
              </div>
            </div>
          </div>

          {/* Claim Username Info Box (If Guest Only & not viewing searched user) */}
          {user.isGuest && !viewedProfile && (
            <div className="my-6 p-4 rounded-2xl bg-secondary-surface/40 border border-primary-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 text-gold flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 fill-gold" />
                </div>
                <div className="text-left">
                  <h4 className="font-sans font-bold text-xs text-primary">Secure Your Permanent Stats Account</h4>
                  <p className="font-sans text-[11px] text-secondary mt-0.5 max-w-md leading-relaxed">
                    Choose your striker nickname to sync streak scores, write debate reports on forums, and showcase your leaderboard prowess. Your guest achievements transfer instantly.
                  </p>
                </div>
              </div>
              <button
                onClick={triggerGoogleLoginSimulator}
                className="text-xs text-gold font-sans font-extrabold hover:underline whitespace-nowrap self-end sm:self-auto cursor-pointer font-bold bg-transparent border-none"
              >
                Claim nickname now →
              </button>
            </div>
          )}

          {/* Edit Profile Form (If Logged In & not viewing searched user) */}
          {!user.isGuest && !viewedProfile && (
            <div className="my-6 text-left">
              {!isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <span className="font-sans text-xs text-secondary">Joined: {user.joinedDate}</span>
                  <span className="text-zinc-500">•</span>
                  <button
                    onClick={() => {
                      setEditInputVal(user.username || '');
                      setEditError(null);
                      setIsEditingUsername(true);
                    }}
                    className="flex items-center gap-1.5 font-sans font-semibold text-xs text-zinc-400 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Change Username</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdateUsernameSubmit} className="flex flex-col gap-2 max-w-sm">
                  <span className="font-sans font-semibold text-xs text-primary block">Update Chosen Username:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editInputVal}
                      onChange={(e) => setEditInputVal(e.target.value)}
                      className="flex-1 bg-secondary-surface border border-primary-border rounded-xl px-3 py-1.5 text-xs text-primary focus:outline-none focus:border-[#E8472A]"
                    />
                    <button
                      type="submit"
                      className="bg-[#E8472A] text-white px-4 py-1.5 rounded-xl text-xs font-bold font-sans hover:bg-[#ff5d42] cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingUsername(false)}
                      className="text-secondary bg-zinc-900 border border-primary-border rounded-xl px-3 py-1.5 text-xs font-sans hover:text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                  {editError && <p className="text-[11px] text-red font-semibold">{editError}</p>}
                </form>
              )}
            </div>
          )}

          {/* Read Only metadata block when looking up a profile */}
          {viewedProfile && (
            <div className="my-6 text-left font-sans text-xs text-secondary bg-[#17171C]/50 border border-primary-border/65 rounded-2xl p-4 flex items-center justify-between">
              <span>Joined: {activeUser.joinedDate || 'Standard Member'}</span>
              <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                Read-Only Interface
              </span>
            </div>
          )}

          {/* Tab Selection */}
          <div className="flex border-b border-primary-border/40 gap-4 mt-6">
            <button
              onClick={() => setActiveSubTab('stats')}
              className={`pb-3 text-xs font-sans font-bold tracking-wide border-b-2 transition-all cursor-pointer ${
                activeSubTab === 'stats'
                  ? 'border-[#E8472A] text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              📊 Stats Dashboard
            </button>
            <button
              onClick={() => setActiveSubTab('comments')}
              className={`pb-3 text-xs font-sans font-bold tracking-wide border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'comments'
                  ? 'border-[#E8472A] text-primary'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{viewedProfile ? `${activeUser.username}'s Debates` : 'My Debates'} ({userCommentsList.length})</span>
            </button>
          </div>

          {/* Sub TAB 1 — STATISTICS */}
          {activeSubTab === 'stats' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              
              <div className="bg-secondary-surface/40 p-4 rounded-xl border border-primary-border text-left">
                <span className="font-sans text-[10px] text-secondary uppercase block tracking-wider">Best Guess Streak</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-display text-3xl text-gold font-black">{activeStats.bestStreak}</span>
                  <span className="text-[10px] text-zinc-500 font-sans font-medium">hits</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-sans mt-2 flex items-center gap-1 text-gold">
                  <Flame className="w-3.5 h-3.5 fill-gold inline" /> Top Streak
                </div>
              </div>

              <div className="bg-secondary-surface/40 p-4 rounded-xl border border-primary-border text-left">
                <span className="font-sans text-[10px] text-secondary uppercase block tracking-wider">Correct Guesses</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-display text-3xl text-[#E8472A] font-black">{activeStats.correctGuesses}</span>
                  <span className="text-[10px] text-zinc-500 font-sans font-medium">hits</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-sans mt-2">
                  of {activeStats.totalGuesses} total attempts
                </div>
              </div>

              <div className="bg-secondary-surface/40 p-4 rounded-xl border border-primary-border text-left">
                <span className="font-sans text-[10px] text-secondary uppercase block tracking-wider font-extrabold text-green/90">Predict Accuracy</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-display text-3xl text-green font-black">{accuracyPercentage}%</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-sans mt-2">
                  predictive hit rate
                </div>
              </div>

              <div className="bg-secondary-surface/40 p-4 rounded-xl border border-primary-border text-left">
                <span className="font-sans text-[10px] text-secondary uppercase block tracking-wider">FAVORITE GAME MODE</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="font-display text-base text-[#E8472A] font-bold tracking-tight block max-w-full truncate">
                    {activeStats.favoriteUniverse || 'Goals'}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-sans mt-2">
                  most played game mode
                </div>
              </div>

            </div>
          )}

          {/* Sub TAB 2 — USER COMMENTS */}
          {activeSubTab === 'comments' && (
            <div className="mt-6 flex flex-col gap-3">
              {userCommentsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-primary-border rounded-xl">
                  <p className="font-sans text-xs text-secondary">
                    {viewedProfile 
                      ? `${activeUser.username} has not posted any comments in debates yet.` 
                      : `You haven't posted any comments in debates yet. Check out "Community Debates" to participate in statistical tactical debates!`}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                  {userCommentsList.map((item, idx) => {
                    return (
                      <div key={idx} className="bg-secondary-surface/40 p-4 rounded-xl border border-primary-border/60 text-left">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-display font-bold text-xs text-gold">
                            Player: {item.charId.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            👍 {item.upvotes} likes • {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="font-sans text-xs text-primary leading-relaxed mt-1">
                          "{item.commentText}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Bottom Right Actions Area */}
      {!viewedProfile ? (
        <div className="flex justify-end px-4 md:px-0 mb-12">
          {user.isGuest ? (
            <div className="flex items-center gap-3">
              <button
                id="google_signin_btn"
                onClick={triggerGoogleLoginSimulator}
                className="bg-[#E8472A] hover:bg-[#ff5d42] active:scale-95 text-white text-xs font-sans font-bold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Claim Striker Nickname</span>
              </button>
              <button
                id="profile_logout_guest_btn"
                onClick={onLogout}
                className="bg-zinc-800/40 hover:bg-zinc-800/80 active:scale-95 text-zinc-400 hover:text-zinc-200 text-xs font-sans font-bold px-4 py-2.5 rounded-xl border border-zinc-700/55 hover:border-zinc-100 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                <span>Reset Game Session</span>
              </button>
            </div>
          ) : ( 
            <button
              id="profile_logout_btn"
              onClick={onLogout}
              className="bg-red/10 hover:bg-red/20 active:scale-97 text-red text-xs font-sans font-bold px-4 py-2.5 rounded-xl border border-red/20 hover:border-red/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 text-red" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-end px-4 md:px-0 mb-12">
          <button
            onClick={() => {
              setViewedProfile(null);
              setSearchQuery('');
              setSearchError(null);
            }}
            className="bg-[#E8472A] hover:bg-[#ff5d42] active:scale-95 text-white text-xs font-sans font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to My Profile</span>
          </button>
        </div>
      )}

      {/* CLAIM USERNAME MODAL (Google Authenticators simulation) */}
      <AnimatePresence>
        {showClaimModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#17171C] border border-white/10 rounded-2xl p-6 max-w-md w-full relative text-left shadow-2xl shadow-black"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="font-display text-lg text-primary font-bold">Secure Your Striker Nickname</h3>
                  <p className="font-sans text-[11px] text-secondary">Define a handle distinct in debate forums</p>
                </div>
              </div>

              <form onSubmit={handleClaimSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="font-sans text-[11px] font-bold text-zinc-400 block mb-1">
                    YOUR ALIAS
                  </label>
                  <input
                    type="text"
                    value={claimedUsernameInput}
                    onChange={(e) => setClaimedUsernameInput(e.target.value)}
                    placeholder="e.g. Goal_Machine_9"
                    className="w-full bg-secondary-surface border border-primary-border rounded-xl px-3.5 py-2.5 text-xs text-primary focus:outline-none focus:border-[#E8472A] font-mono"
                  />
                  {usernameError ? (
                    <p className="text-[10px] text-red font-semibold mt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> {usernameError}
                    </p>
                  ) : (
                    <p className="text-[9px] text-zinc-500 mt-1">
                      Rules: 3-20 characters, alphanumeric, and underscores only.
                    </p>
                  )}
                </div>

                <div className="bg-secondary-surface/40 p-3 rounded-lg border border-primary-border text-zinc-500 text-[10px] leading-relaxed">
                  🔐 **Secure Sync**: Submitting links your statistics to your custom profile securely across page refreshes.
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(false)}
                    className="font-sans font-bold text-xs text-secondary bg-zinc-950 border border-white/5 hover:border-white/10 px-4 py-2.5 rounded-xl text-center active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="font-sans font-bold text-xs text-white bg-[#E8472A] hover:bg-[#ff5d42] active:scale-95 px-5 py-2.5 rounded-xl text-center transition-all shadow-md shadow-[#E8472A]/10 cursor-pointer"
                  >
                    Claim Alias →
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating alert error popup for taken usernames */}
      <AnimatePresence>
        {popupAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#17171C] border border-[#E8472A]/40 max-w-sm w-full rounded-2xl p-6 text-center shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-full bg-[#E8472A]/10 text-[#E8472A] flex items-center justify-center mx-auto mb-4 border border-[#E8472A]/20">
                <ShieldAlert className="w-6 h-6 opacity-85" />
              </div>
              <h3 className="font-display text-base font-bold text-[#E8472A] uppercase tracking-wider mb-2">
                Already Taken
              </h3>
              <p className="font-sans text-xs text-zinc-300 leading-relaxed mb-6">
                {popupAlert.message}
              </p>
              <button
                onClick={() => setPopupAlert(null)}
                className="w-full bg-[#E8472A] hover:bg-[#ff5d42] text-white py-2.5 font-sans font-bold text-xs rounded-xl active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Okay, I'll Change It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
