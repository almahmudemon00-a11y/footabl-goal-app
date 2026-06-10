/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GoalSpire Game Platform - Deploy Trigger Comment
 */

import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { Sparkles, Medal, User, Flame, Moon, Sun, MessageSquare, Compass, Settings, CircleDot, Trophy } from 'lucide-react';
import { Character, Comment, User as UserType, UserStats } from './types.ts';
import { DEFAULT_CHARACTERS, PRE_SEEDED_COMMENTS } from './data.ts';
import { getDirectImageUrl } from './utils.ts';
import { playClickSound } from './utils/sound.ts';

// Firebase integration modules
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  limit
} from 'firebase/firestore';
import { db, auth, googleProvider, handleFirestoreError, OperationType } from './firebase.ts';

// Dynamic sub-screens
import PlayScreen from './components/PlayScreen.tsx';
import CommunityScreen from './components/CommunityScreen.tsx';
import ProfileScreen from './components/ProfileScreen.tsx';
import SettingsScreen from './components/SettingsScreen.tsx';
import PlayerScreen from './components/PlayerScreen.tsx';
import { updateSEOMetadata } from './utils/seo.ts';

export default function App() {
  // Router path state
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Sync activeTab dynamically with currentPath on mount and popstate runs
  const [activeTab, setActiveTab] = useState<'play' | 'community' | 'profile' | 'settings'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/community') || path.startsWith('/post/')) return 'community';
    if (path.startsWith('/profile') || path.startsWith('/user/')) return 'profile';
    if (path.startsWith('/settings')) return 'settings';
    return 'play';
  });
  
  // Secondary target to auto-activate inside Community Tab on redirect
  const [communityExpandTargetCharId, setCommunityExpandTargetCharId] = useState<string | undefined>(undefined);
  const [viewedUserUsername, setViewedUserUsername] = useState<string | undefined>(undefined);

  // Dynamic Navigation trigger helper
  const navigateTo = (path: string) => {
    window.history.pushState(null, '', path);
    setCurrentPath(path);
  };

  // Listen to browser history navigation changes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update inner tabs states and execute page-level SEO updates
  useEffect(() => {
    const path = currentPath;

    const postMatch = path.match(/^\/post\/([a-zA-Z0-9_\-]+)/);
    const playerMatch = path.match(/^\/player\/([a-zA-Z0-9_\-]+)/);
    const userMatch = path.match(/^\/user\/([a-zA-Z0-9_\-]+)/);

    if (postMatch) {
      setActiveTab('community');
      setCommunityExpandTargetCharId(postMatch[1]);
      setViewedUserUsername(undefined);
    } else if (playerMatch) {
      setViewedUserUsername(undefined);
    } else if (userMatch) {
      setActiveTab('profile');
      setViewedUserUsername(userMatch[1]);
      setCommunityExpandTargetCharId(undefined);
    } else {
      setViewedUserUsername(undefined);
      setCommunityExpandTargetCharId(undefined);
      
      if (path === '/community') {
        setActiveTab('community');
      } else if (path === '/profile') {
        setActiveTab('profile');
      } else if (path === '/settings') {
        setActiveTab('settings');
      } else {
        setActiveTab('play');
      }
    }

    // Dynamic global metadata tagging based on current route
    if (path === '/' || path === '/play' || (!postMatch && !playerMatch && !userMatch && path !== '/community' && path !== '/profile' && path !== '/settings')) {
      updateSEOMetadata({
        title: "GoalSpire - Play. Debate. Rank Up.",
        description: "GoalSpire is a football player comparison game where you play, debate, and rank up. Guess higher or lower stats and climb the esports leaderboard.",
        canonicalUrl: "https://goalspire.top/",
        ogTitle: "GoalSpire - Play. Debate. Rank Up.",
        ogDescription: "GoalSpire is a football player comparison game where you play, debate, and rank up. Guess higher or lower stats and climb the esports leaderboard."
      });
    } else if (path === '/community' && !postMatch) {
      updateSEOMetadata({
        title: "Football Debate Community & Arena Forums | GoalSpire",
        description: "Join debates on Messi vs Ronaldo, Ballon d'Or predictions, and match rankings inside GoalSpire's football forum.",
        canonicalUrl: "https://goalspire.top/community"
      });
    } else if (path === '/settings') {
      updateSEOMetadata({
        title: "Esports Settings & Volume Preferences | GoalSpire",
        description: "Manage sound effects volume, dark theme controls, and administrator tools for GoalSpire.",
        canonicalUrl: "https://goalspire.top/settings"
      });
    }
  }, [currentPath]);

  // Theme control: dark/light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  // Characters roster state
  const [characters, setCharacters] = useState<Character[]>(DEFAULT_CHARACTERS);
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem('custom_sheet_url') || '';
  });
  const [isSheetLoading, setIsSheetLoading] = useState<boolean>(false);

  // Dynamic user-custom feedback email address
  const [feedbackEmail, setFeedbackEmail] = useState<string>(() => {
    return localStorage.getItem('feedback_email') || 'almagdjsg@gmail.com';
  });

  // Corporate branding assets configurations
  const [faviconUrl] = useState<string>(
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'%3E%3Cdefs%3E%3ClinearGradient id='brand' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23E8472A'/%3E%3Cstop offset='100%25' stop-color='%23ff6b52'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='36' height='36' rx='10' fill='url(%23brand)'/%3E%3Cg transform='translate%286, 5%29' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none'%3E%3Cpath d='M6 9H4.5a2.5 2.5 0 0 1 0-5H6'/%3E%3Cpath d='M18 9h1.5a2.5 2.5 0 0 0 0-5H18'/%3E%3Cpath d='M4 22h16'/%3E%3Cpath d='M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34'/%3E%3Cpath d='M12 2a6 6 0 0 0-6 6v1a6 6 0 0 0 12 0V8a6 6 0 0 0-6-6z'/%3E%3C/g%3E%3Ccircle cx='29' cy='29' r='5' fill='%2310b981' stroke='%23E8472A' stroke-width='1.5'/%3E%3Ccircle cx='29' cy='29' r='2.5' fill='white'/%3E%3C/svg%3E"
  );
  const [logoUrl] = useState<string>('');

  // Dynamic Tab Icon (Favicon) configuration
  useEffect(() => {
    let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = getDirectImageUrl(faviconUrl) || '/favicon.ico';
  }, [faviconUrl]);

  // Authenticated user store
  const [user, setUser] = useState<UserType>(() => {
    // Check local guest/username records
    let guestId = localStorage.getItem('guestId');
    if (!guestId || !/^GuestUser\d{5}$/.test(guestId)) {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      guestId = `GuestUser${randNum}`;
      localStorage.setItem('guestId', guestId);
    }

    let savedUsername = localStorage.getItem('username');
    if (!savedUsername || !/^GuestUser\d{5}$/.test(savedUsername)) {
      savedUsername = guestId;
      localStorage.setItem('username', savedUsername);
    }

    const savedAvatar = localStorage.getItem('avatar');
    const savedJoined = localStorage.getItem('joined_date') || new Date().toLocaleDateString();

    return {
      isGuest: true,
      guestId,
      username: savedUsername,
      avatar: savedAvatar || (savedUsername ? savedUsername.slice(0, 2).toUpperCase() : 'GU'),
      joinedDate: savedJoined,
    };
  });

  // Client stats store
  const [stats, setStats] = useState<UserStats>(() => {
    const bestStreak = parseInt(localStorage.getItem('bestStreak') || '0', 10);
    const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0', 10);
    const correctGuesses = parseInt(localStorage.getItem('correctGuesses') || '0', 10);
    const totalGuesses = parseInt(localStorage.getItem('totalGuesses') || '0', 10);
    
    // Compute favorite game mode based on user's play counts
    const goalsPlayCount = parseInt(localStorage.getItem('mode_goals') || '0', 10);
    const assistsPlayCount = parseInt(localStorage.getItem('mode_assists') || '0', 10);
    const gAndAPlayCount = parseInt(localStorage.getItem('mode_gAndA') || '0', 10);
    
    let fav = 'Goals';
    let maxPlay = goalsPlayCount;
    if (assistsPlayCount > maxPlay) {
      fav = 'Assists';
      maxPlay = assistsPlayCount;
    }
    if (gAndAPlayCount > maxPlay) {
      fav = 'G+A';
      maxPlay = gAndAPlayCount;
    }
    
    // If no counts recorded yet, check if there was a saved favoriteUniverse value (for backwards compatibility)
    const savedFav = localStorage.getItem('favoriteUniverse');
    if (savedFav && goalsPlayCount === 0 && assistsPlayCount === 0 && gAndAPlayCount === 0) {
      if (['Goals', 'Assists', 'G+A'].includes(savedFav)) {
        fav = savedFav;
      }
    }
    
    localStorage.setItem('favoriteUniverse', fav);

    return {
      bestStreak,
      gamesPlayed,
      correctGuesses,
      totalGuesses,
      favoriteUniverse: fav,
    };
  });

  // Keep streak active across tabs
  const [streak, setStreak] = useState<number>(0);

  // Sound system volume state, saved in localStorage
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    const saved = localStorage.getItem('sound_volume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });

  const handleSoundVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    localStorage.setItem('sound_volume', vol.toString());
  };

  // Live Comments debate index
  const [comments, setComments] = useState<Record<string, Comment[]>>({});

  // Football Community Seed Data & Live Thread subscriptions for indexing Player threads
  const [seedData, setSeedData] = useState<{
    users: any[];
    threads: any[];
    comments: any[];
  } | null>(null);
  const [rawThreads, setRawThreads] = useState<any[]>([]);

  useEffect(() => {
    fetch('/football_seed_data.json')
      .then(res => res.json())
      .then(data => {
        setSeedData(data);
      })
      .catch(err => {
        console.error('Failed to load community seed.json in App.tsx:', err);
      });
  }, []);

  useEffect(() => {
    const qPosts = query(collection(db, 'threads'), orderBy('timestamp', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      setRawThreads(list);
    }, (err) => {
      console.error("Error loading threads in App.tsx:", err);
    });
    return () => unsubPosts();
  }, []);

  const mergedThreads = useMemo(() => {
    if (!seedData || !seedData.threads) return rawThreads;
    const merged = [...rawThreads];
    const rawIds = new Set(rawThreads.map(p => p.threadId));
    seedData.threads.forEach(t => {
      if (!rawIds.has(t.threadId)) {
        merged.push(t);
      }
    });

    const counts: Record<string, number> = {};

    (Object.entries(comments) as [string, any[]][]).forEach(([key, list]) => {
      counts[key] = (counts[key] || 0) + (list?.length || 0);
    });

    const currentCommentIds = new Set((Object.values(comments) as any[][]).flat().map(c => c.id || c.commentId));
    if (seedData && seedData.comments) {
      seedData.comments.forEach(c => {
        const cid = c.commentId || c.id;
        if (cid && !currentCommentIds.has(cid)) {
          const pid = c.postId || c.characterId;
          if (pid) {
            counts[pid] = (counts[pid] || 0) + 1;
          }
        }
      });
    }

    const enriched = merged.map(p => ({
      ...p,
      commentsCount: counts[p.threadId] || 0
    }));

    return enriched.sort((a, b) => b.timestamp - a.timestamp);
  }, [rawThreads, seedData, comments]);

  // Helpers to check and generate guaranteed unique username
  const checkIfUsernameTaken = async (usernameToCheck: string, excludeUid: string | null): Promise<boolean> => {
    try {
      const usersCol = collection(db, 'users');
      const q = query(
        usersCol, 
        where('username', '==', usernameToCheck)
      );
      const querySnapshot = await getDocs(q);
      
      let taken = false;
      querySnapshot.forEach((doc) => {
        if (excludeUid === null || doc.id !== excludeUid) {
          taken = true;
        }
      });
      return taken;
    } catch (e) {
      console.error('Error checking unique username:', e);
      return false;
    }
  };

  const searchUserByUsername = async (usernameToSearch: string): Promise<{ searchedUser: UserType; searchedStats: UserStats } | null> => {
    try {
      const usersCol = collection(db, 'users');
      const q = query(
        usersCol,
        where('username', '==', usernameToSearch)
      );
      const querySnapshot = await getDocs(q);
      
      let foundDoc: any = null;
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          foundDoc = { id: doc.id, ...doc.data() };
        });
      } else {
        // Fallback: search in static seedData.users
        if (seedData && seedData.users) {
          const matchedStatic = seedData.users.find(
            u => u.username && u.username.toLowerCase() === usernameToSearch.toLowerCase()
          );
          if (matchedStatic) {
            foundDoc = {
              id: matchedStatic.userId || matchedStatic.uid,
              username: matchedStatic.username,
              avatar: matchedStatic.userAvatar || matchedStatic.avatar || '⚽',
              joinedDate: matchedStatic.joinedDate || 'Unknown',
              bio: matchedStatic.bio || '',
              bestStreak: matchedStatic.bestStreak || 0,
              gamesPlayed: matchedStatic.gamesPlayed || 0,
              correctGuesses: matchedStatic.correctGuesses || 0,
              totalGuesses: matchedStatic.totalGuesses || 0,
              favoriteUniverse: matchedStatic.favoriteUniverse || 'International Football',
            };
          }
        }
      }
      
      if (!foundDoc) return null;
      
      const searchedUser: UserType = {
        uid: foundDoc.id,
        isGuest: false,
        guestId: 'Guest_' + foundDoc.id.slice(0, 4),
        username: foundDoc.username,
        avatar: foundDoc.avatar || '🏆',
        joinedDate: foundDoc.joinedDate || 'Unknown',
        isAdmin: !!foundDoc.isAdmin,
        bio: foundDoc.bio || '',
      };
      
      const searchedStats: UserStats = {
        bestStreak: foundDoc.bestStreak || 0,
        gamesPlayed: foundDoc.gamesPlayed || 0,
        correctGuesses: foundDoc.correctGuesses || 0,
        totalGuesses: foundDoc.totalGuesses || 0,
        favoriteUniverse: foundDoc.favoriteUniverse || 'Goals',
      };
      
      return { searchedUser, searchedStats };
    } catch (e) {
      console.error('Error searching user:', e);
      return null;
    }
  };

  const generateUniqueUsername = async (): Promise<string> => {
    const prefixes = ['Striker_No9', 'Player', 'Fan', 'Winger', 'Midfielder', 'Forward', 'Goalkeeper', 'Defender'];
    let attempts = 0;
    let isUnique = false;
    let candidate = '';
    
    while (!isUnique && attempts < 50) {
      attempts++;
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      let suffix = '';
      if (prefix === 'Striker_No9') {
        suffix = '_' + Math.floor(100 + Math.random() * 900);
      } else {
        suffix = '_' + Math.floor(10000 + Math.random() * 90000);
      }
      candidate = `${prefix}${suffix}`;
      const isTaken = await checkIfUsernameTaken(candidate, null);
      if (!isTaken) {
        isUnique = true;
      }
    }
    
    if (!isUnique) {
      candidate = 'Player_' + Math.floor(100000 + Math.random() * 900000);
    }
    return candidate;
  };

  const createOrGetUserProfile = async (firebaseUser: any) => {
    const userId = firebaseUser.uid;
    const userRef = doc(db, 'users', userId);
    
    try {
      const docSnap = await getDoc(userRef);
      const joined = new Date().toLocaleDateString();
      const isUserAdmin = userId === 'W97e8GcIGObrIiM1G5cRZV4BF3Z2' || 
                          userId === '5V7for1aVtZhIjWCNR4vDfHllOA3' || 
                          firebaseUser.email === 'almahmudemon00@gmail.com';
      
      if (docSnap.exists()) {
        localStorage.removeItem('pending_claimed_username');
        const data = docSnap.data();
        let uniqueUsername = data.username;
        
        if (!uniqueUsername) {
          uniqueUsername = await generateUniqueUsername();
        }
        
        const mergedBest = Math.max(stats.bestStreak, data.bestStreak || 0);
        const mergedPlayed = Math.max(stats.gamesPlayed, data.gamesPlayed || 0);
        const mergedCorrect = Math.max(stats.correctGuesses, data.correctGuesses || 0);
        const mergedTotal = Math.max(stats.totalGuesses, data.totalGuesses || 0);
        
        const defaultAvatar = uniqueUsername.slice(0, 2).toUpperCase() || 'P';
        
        await updateDoc(userRef, {
          username: uniqueUsername,
          bestStreak: mergedBest,
          gamesPlayed: mergedPlayed,
          correctGuesses: mergedCorrect,
          totalGuesses: mergedTotal,
          isAdmin: isUserAdmin,
          updatedAt: serverTimestamp()
        });
        
        const finalUser = {
          uid: userId,
          isGuest: false,
          guestId: 'Guest_' + userId.slice(0, 4),
          username: uniqueUsername,
          avatar: data.avatar || defaultAvatar,
          joinedDate: data.joinedDate || joined,
          isAdmin: isUserAdmin,
          bio: data.bio || '',
        };
        
        // Save to local storage for persistence across reloads/offline scenarios
        localStorage.setItem('username', finalUser.username);
        localStorage.setItem('avatar', finalUser.avatar);
        localStorage.setItem('bestStreak', mergedBest.toString());
        localStorage.setItem('gamesPlayed', mergedPlayed.toString());
        localStorage.setItem('correctGuesses', mergedCorrect.toString());
        localStorage.setItem('totalGuesses', mergedTotal.toString());
        localStorage.setItem('bio', finalUser.bio);

        setUser(finalUser);
        setStats({
          bestStreak: mergedBest,
          gamesPlayed: mergedPlayed,
          correctGuesses: mergedCorrect,
          totalGuesses: mergedTotal,
          favoriteUniverse: data.favoriteUniverse || 'Goals',
        });
      } else {
        localStorage.removeItem('pending_claimed_username');
        
        const uniqueUsername = await generateUniqueUsername();
        const defaultAvatar = uniqueUsername.slice(0, 2).toUpperCase() || 'P';
        
        const record = {
          userId,
          username: uniqueUsername,
          avatar: defaultAvatar,
          bestStreak: parseInt(localStorage.getItem('bestStreak') || '0', 10),
          gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || '0', 10),
          correctGuesses: parseInt(localStorage.getItem('correctGuesses') || '0', 10),
          totalGuesses: parseInt(localStorage.getItem('totalGuesses') || '0', 10),
          favoriteUniverse: localStorage.getItem('favoriteUniverse') || 'Goals',
          joinedDate: joined,
          isAdmin: isUserAdmin
        };
        
        await setDoc(userRef, {
          ...record,
          updatedAt: serverTimestamp()
        });
        
        localStorage.setItem('username', uniqueUsername);
        localStorage.setItem('avatar', defaultAvatar);
        localStorage.setItem('bestStreak', record.bestStreak.toString());
        localStorage.setItem('gamesPlayed', record.gamesPlayed.toString());
        localStorage.setItem('correctGuesses', record.correctGuesses.toString());
        localStorage.setItem('totalGuesses', record.totalGuesses.toString());
        localStorage.setItem('bio', '');

        setUser({
          uid: userId,
          isGuest: false,
          guestId: 'Guest_' + userId.slice(0, 4),
          username: uniqueUsername,
          avatar: defaultAvatar,
          joinedDate: joined,
          isAdmin: isUserAdmin,
          bio: '',
        });
        
        setStats({
          bestStreak: record.bestStreak,
          gamesPlayed: record.gamesPlayed,
          correctGuesses: record.correctGuesses,
          totalGuesses: record.totalGuesses,
          favoriteUniverse: record.favoriteUniverse || 'Goals',
        });
      }
    } catch (error) {
      console.error('Error creating/loading authentic user document:', error);
    }
  };

  // Sync theme to document body classes on load
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Seeding default comments helper
  const seedDatabaseIfEmpty = async (currentUid: string) => {
    try {
      const commentsColRef = collection(db, 'comments');
      const snap = await getDocs(commentsColRef);
      if (snap.empty) {
        console.log('Seeding default comments to Firestore...');
        for (const [charId, list] of Object.entries(PRE_SEEDED_COMMENTS)) {
          for (const comment of list) {
            const docRef = doc(commentsColRef, comment.id);
            await setDoc(docRef, {
              commentId: comment.id,
              postId: charId,
              characterId: charId,
              userId: currentUid,
              authorId: currentUid,
              username: comment.username,
              text: comment.text,
              content: comment.text,
              upvotes: comment.upvotes || 0,
              timestamp: comment.timestamp,
              createdAt: comment.timestamp,
              likedBy: []
            });
          }
        }
        console.log('Database seeded successfully.');
      }
    } catch (error) {
      console.error('Failed to seed default comments:', error);
    }
  };

  // Firebase Realtime Subscriptions & Authentication Monitor
  useEffect(() => {
    // 1. Real-time sync comments debate collection
    const commentsQuery = query(collection(db, 'comments'), orderBy('timestamp', 'desc'));
    const unsubComments = onSnapshot(commentsQuery, (snapshot) => {
      if (snapshot.empty) {
        setComments(PRE_SEEDED_COMMENTS);
        return;
      }
      const newComments: Record<string, Comment[]> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const charId = data.characterId || data.postId;
        if (charId) {
          if (!newComments[charId]) {
            newComments[charId] = [];
          }
          newComments[charId].push({
            id: doc.id,
            commentId: doc.id,
            postId: charId,
            characterId: charId,
            userId: data.userId || data.authorId || '',
            authorId: data.authorId || data.userId || '',
            username: data.username || 'Anonymous',
            text: data.text || data.content || '',
            content: data.content || data.text || '',
            upvotes: data.upvotes || 0,
            timestamp: data.timestamp || data.createdAt || Date.now(),
            createdAt: data.createdAt || data.timestamp || Date.now(),
            likedBy: data.likedBy || [],
            downvotes: data.downvotes || 0,
            dislikedBy: data.dislikedBy || [],
            replyToUsername: data.replyToUsername || undefined
          });
        }
      });
      setComments(newComments);
    }, (error) => {
      console.error('Comments subscription errored:', error);
    });

    // 2. Monitor active Firebase Auth status
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userId = firebaseUser.uid;
        seedDatabaseIfEmpty(userId);
        await createOrGetUserProfile(firebaseUser);
      } else {
        // Logged out / Fallback to local guest indices
        let currentGuestId = localStorage.getItem('guestId');
        if (!currentGuestId || !/^GuestUser\d{5}$/.test(currentGuestId)) {
          const randNum = Math.floor(10000 + Math.random() * 90000);
          currentGuestId = `GuestUser${randNum}`;
          localStorage.setItem('guestId', currentGuestId);
        }

        let savedUsername = localStorage.getItem('username');
        if (!savedUsername || !/^GuestUser\d{5}$/.test(savedUsername)) {
          savedUsername = currentGuestId;
          localStorage.setItem('username', savedUsername);
        }

        const savedAvatar = localStorage.getItem('avatar');
        
        setUser({
          uid: undefined,
          isGuest: true,
          guestId: currentGuestId,
          username: savedUsername,
          avatar: savedAvatar || (savedUsername ? savedUsername.slice(0, 2).toUpperCase() : 'GU'),
          joinedDate: localStorage.getItem('joined_date') || new Date().toLocaleDateString(),
          isAdmin: false,
          bio: localStorage.getItem('bio') || '',
        });

        const loginGoals = parseInt(localStorage.getItem('mode_goals') || '0', 10);
        const loginAssists = parseInt(localStorage.getItem('mode_assists') || '0', 10);
        const loginGAndA = parseInt(localStorage.getItem('mode_gAndA') || '0', 10);
        let loginFav = 'Goals';
        let loginMax = loginGoals;
        if (loginAssists > loginMax) {
          loginFav = 'Assists';
          loginMax = loginAssists;
        }
        if (loginGAndA > loginMax) {
          loginFav = 'G+A';
          loginMax = loginGAndA;
        }
        localStorage.setItem('favoriteUniverse', loginFav);

        setStats({
          bestStreak: parseInt(localStorage.getItem('bestStreak') || '0', 10),
          gamesPlayed: parseInt(localStorage.getItem('gamesPlayed') || '0', 10),
          correctGuesses: parseInt(localStorage.getItem('correctGuesses') || '0', 10),
          totalGuesses: parseInt(localStorage.getItem('totalGuesses') || '0', 10),
          favoriteUniverse: loginFav,
        });
      }
    });

    return () => {
      unsubComments();
      unsubAuth();
    };
  }, []);

  // Sync custom google settings (like Google Sheets URL) in real-time across all clients
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const url = data.custom_sheet_url || '';
        setSheetUrl(url);
        if (url) {
          localStorage.setItem('custom_sheet_url', url);
        } else {
          localStorage.removeItem('custom_sheet_url');
        }

        const email = data.feedback_email || 'almagdjsg@gmail.com';
        setFeedbackEmail(email);
        localStorage.setItem('feedback_email', email);
      }
    }, (error) => {
      console.error('Settings subscription errored:', error);
    });

    return () => {
      unsubSettings();
    };
  }, []);

  // Sync custom google sheets URL changes when sheetUrl changes (e.g. from global state sync or user setting)
  useEffect(() => {
    if (sheetUrl) {
      fetchGoogleSheetData(sheetUrl, false).catch(() => {
        setCharacters(DEFAULT_CHARACTERS);
      });
    } else {
      setCharacters(DEFAULT_CHARACTERS);
    }
  }, [sheetUrl]);

  const handleUpdateFeedbackEmail = async (newEmail: string) => {
    setFeedbackEmail(newEmail);
    localStorage.setItem('feedback_email', newEmail);
    try {
      await setDoc(doc(db, 'settings', 'global_config'), {
        custom_sheet_url: sheetUrl,
        feedback_email: newEmail,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global_config');
    }
  };

  // Synchronous and Secure stats updates synced with Firestore backwall
  const handleUpdateStats = async (correct: boolean, nextStreak?: number, playedMode?: 'goals' | 'assists' | 'gAndA') => {
    // Read the latest state values
    const latestBest = parseInt(localStorage.getItem('bestStreak') || '0', 10);
    
    // Increment mode count in localStorage
    let goalsCount = parseInt(localStorage.getItem('mode_goals') || '0', 10);
    let assistsCount = parseInt(localStorage.getItem('mode_assists') || '0', 10);
    let gAndACount = parseInt(localStorage.getItem('mode_gAndA') || '0', 10);

    if (playedMode) {
      if (playedMode === 'goals') {
        goalsCount += 1;
        localStorage.setItem('mode_goals', goalsCount.toString());
      } else if (playedMode === 'assists') {
        assistsCount += 1;
        localStorage.setItem('mode_assists', assistsCount.toString());
      } else if (playedMode === 'gAndA') {
        gAndACount += 1;
        localStorage.setItem('mode_gAndA', gAndACount.toString());
      }
    }

    // Determine favorite game mode
    let favMode = 'Goals';
    let maxPlay = goalsCount;
    if (assistsCount > maxPlay) {
      favMode = 'Assists';
      maxPlay = assistsCount;
    }
    if (gAndACount > maxPlay) {
      favMode = 'G+A';
      maxPlay = gAndACount;
    }

    localStorage.setItem('favoriteUniverse', favMode);

    setStats(prev => {
      const nextTotal = prev.totalGuesses + 1;
      const nextCorrect = correct ? prev.correctGuesses + 1 : prev.correctGuesses;
      const nextGamesPlayed = prev.gamesPlayed + (correct ? 0 : 1);
      
      let nextBestStreak = prev.bestStreak;
      if (nextStreak !== undefined) {
        nextBestStreak = Math.max(nextBestStreak, nextStreak);
      } else {
        nextBestStreak = Math.max(nextBestStreak, latestBest);
      }
      
      const updated = {
        bestStreak: nextBestStreak,
        gamesPlayed: nextGamesPlayed,
        correctGuesses: nextCorrect,
        totalGuesses: nextTotal,
        favoriteUniverse: favMode,
      };

      // Write values to local cache storage
      localStorage.setItem('bestStreak', nextBestStreak.toString());
      localStorage.setItem('gamesPlayed', nextGamesPlayed.toString());
      localStorage.setItem('correctGuesses', nextCorrect.toString());
      localStorage.setItem('totalGuesses', nextTotal.toString());

      // If securely signed in, persist to Firestore DB
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        updateDoc(userRef, {
          bestStreak: nextBestStreak,
          gamesPlayed: nextGamesPlayed,
          correctGuesses: nextCorrect,
          totalGuesses: nextTotal,
          favoriteUniverse: favMode,
          updatedAt: serverTimestamp()
        }).catch(err => {
          handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
        });
      }

      return updated;
    });
  };

  // Google Sheets Fetcher + Parser
  const fetchGoogleSheetData = async (url: string, persistToFirestore: boolean = false): Promise<{ success: boolean; error?: string }> => {
    setIsSheetLoading(true);
    try {
      let parsedUrl = url.trim();

      if (!parsedUrl) {
        setCharacters(DEFAULT_CHARACTERS);
        setSheetUrl('');
        localStorage.removeItem('custom_sheet_url');
        if (persistToFirestore) {
          try {
            await setDoc(doc(db, 'settings', 'global_config'), {
              custom_sheet_url: '',
              feedback_email: feedbackEmail,
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'settings/global_config');
          }
        }
        setIsSheetLoading(false);
        return { success: true };
      }

      // Automatically translate standard Google Sheet links to direct CORS-friendly CSV export URLs
      if (parsedUrl.includes('docs.google.com/spreadsheets')) {
        // If it's a published pubhtml, rewrite to pub?output=csv
        if (parsedUrl.includes('/pubhtml')) {
          parsedUrl = parsedUrl.replace('/pubhtml', '/pub');
          if (!parsedUrl.includes('output=csv')) {
            parsedUrl += (parsedUrl.includes('?') ? '&' : '?') + 'output=csv';
          }
        } 
        // If it is a normal edit/sharing URL, convert to export Format as csv
        else if (parsedUrl.includes('/edit') || parsedUrl.includes('/share') || !parsedUrl.includes('/export')) {
          const sheetIdMatch = parsedUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (sheetIdMatch) {
            const sheetId = sheetIdMatch[1];
            const gidMatch = parsedUrl.match(/[#?&]gid=([0-9]+)/);
            const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
            parsedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
          }
        }
      }

      const res = await fetch(parsedUrl);
      if (!res.ok) {
        throw new Error(`Failed response (HTTP status ${res.status}). Ensure your sheet's share settings allow anyone with the link to view.`);
      }
      const text = await res.text();
      
      if (text.trim().startsWith('<html') || text.trim().startsWith('<!DOCTYPE html')) {
        throw new Error('Retrieved HTML instead of CSV. Ensure your Google Sheet is shared so "Anyone with the link can view", or "Publish to the web" as CSV.');
      }

      // Advanced Quote-Safe CSV Parser
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('This sheet contains header-only or is empty.');
      }

      const parseCSVLine = (line: string): string[] => {
        const parts: string[] = [];
        let currentPart = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(currentPart);
            currentPart = '';
          } else {
            currentPart += char;
          }
        }
        parts.push(currentPart);
        return parts;
      };

      const headerRow = parseCSVLine(lines[0]);
      const headers = headerRow.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

      const getColumnIndex = (potentialKeys: string[], defaultIdx: number) => {
        const normalizedPotentialKeys = potentialKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
        
        // Pass 1: Look for exact matches
        for (const normKey of normalizedPotentialKeys) {
          const idx = headers.findIndex(h => h === normKey);
          if (idx !== -1) return idx;
        }

        // Pass 2: Look for partial matches where header starts with or contains the key
        for (const normKey of normalizedPotentialKeys) {
          const idx = headers.findIndex(h => h.includes(normKey) || normKey.includes(h));
          if (idx !== -1) return idx;
        }

        return defaultIdx;
      };

      // Match columns dynamically with ultra-robust keys
      const idIdx = getColumnIndex(['playerid', 'characterid', 'id', 'uid'], 0);
      const nameIdx = getColumnIndex(['playername', 'player', 'name', 'charactername', 'character'], 1);
      const universeIdx = getColumnIndex(['club', 'clubname', 'club_name', 'team', 'universe', 'series', 'franchise', 'origin', 'world'], 2);
      const categoryIdx = getColumnIndex(['country', 'countryname', 'country_name', 'nation', 'nationality', 'category', 'group', 'class'], 3);
      const goalsIdx = getColumnIndex(['goals', 'goal', 'bodycount', 'body_count', 'kills', 'count'], 4);
      const assistsIdx = getColumnIndex(['assists', 'assist', 'counttype', 'count_type'], 5);
      const gaIdx = getColumnIndex(['ga', 'g+a', 'gap', 'goalsassists', 'goals+assists'], 6);
      const imageUrlIdx = getColumnIndex(['imageurl', 'image_url', 'image', 'picture', 'pic', 'img', 'url', 'link', 'photo'], 7);

      const parsedCharacters: Character[] = lines.slice(1).map((line, idx) => {
        const parts = parseCSVLine(line);

        // Advanced string sanitizer with complete quote cleaning
        const sanitize = (val: string | undefined) => {
          if (!val) return '';
          let cleaned = val.trim();
          while ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                 (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1).trim();
          }
          return cleaned;
        };

        // Ultimate Google Sheets / Drive and universal image URL utility
        const sanitizeImageUrl = (val: string | undefined): string => {
          if (!val) return '';
          let cleaned = val.trim();
          
          while ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                 (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1).trim();
          }

          // Support Google Sheets =IMAGE("url") or =image('url') formula
          const imageFormulaMatch = cleaned.match(/=image\s*\(\s*["']([^"']+)["']/i);
          if (imageFormulaMatch && imageFormulaMatch[1]) {
            cleaned = imageFormulaMatch[1].trim();
          }

          // Support Google Sheets =HYPERLINK("url", "text") formula
          const hyperlinkFormulaMatch = cleaned.match(/=hyperlink\s*\(\s*["']([^"']+)["']/i);
          if (hyperlinkFormulaMatch && hyperlinkFormulaMatch[1]) {
            cleaned = hyperlinkFormulaMatch[1].trim();
          }

          while ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
                 (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1).trim();
          }

          // Support Google Drive direct download transformation (handles docs.google / drive.google)
          if (cleaned.includes('drive.google.com') || cleaned.includes('docs.google.com')) {
            const driveIdMatch = cleaned.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || cleaned.match(/[?&]id=([a-zA-Z0-9-_]+)/);
            if (driveIdMatch && driveIdMatch[1]) {
              cleaned = `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`;
            }
          }

          // Support Dropbox direct link transformation
          if (cleaned.includes('dropbox.com')) {
            if (cleaned.includes('dl=0')) {
              cleaned = cleaned.replace('dl=0', 'raw=1');
            } else if (!cleaned.includes('raw=1')) {
              cleaned += (cleaned.includes('?') ? '&' : '?') + 'raw=1';
            }
          }

          return cleaned;
        };

        const name = sanitize(parts[nameIdx]);
        const charId = sanitize(parts[idIdx]) || name.replace(/[^a-zA-Z0-9]/g, '_') || `PLAYER_${idx}`;
        const universe = sanitize(parts[universeIdx]) || 'Default';
        const category = sanitize(parts[categoryIdx]) || 'Uncategorized';
        
        const goals = parseInt(sanitize(parts[goalsIdx]), 10) || 0;
        const assists = parseInt(sanitize(parts[assistsIdx]), 10) || 0;
        const gaVal = parts[gaIdx] ? parseInt(sanitize(parts[gaIdx]), 10) : NaN;
        const gAndA = !isNaN(gaVal) ? gaVal : (goals + assists);
        
        const countType = 'Official Stats';
        const imageUrl = sanitizeImageUrl(parts[imageUrlIdx]);

        return {
          id: charId,
          name,
          universe, // mapped to Club
          category, // mapped to Country
          goals,
          assists,
          gAndA,
          bodyCount: goals, // Default mapped to goals for backwards compatibility
          countType,
          imageUrl,
        };
      }).filter(c => c.name);

      if (parsedCharacters.length > 0) {
        setCharacters(parsedCharacters);
        setSheetUrl(parsedUrl);
        localStorage.setItem('custom_sheet_url', parsedUrl);
        if (persistToFirestore) {
          try {
            await setDoc(doc(db, 'settings', 'global_config'), {
              custom_sheet_url: parsedUrl,
              feedback_email: feedbackEmail,
              updatedAt: serverTimestamp()
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'settings/global_config');
          }
        }
        setIsSheetLoading(false);
        return { success: true };
      }
      
      throw new Error('No characters with a valid name column found under headers: ' + headerRow.join(', '));
    } catch (e: any) {
      if (e instanceof TypeError || (e.message && e.message.includes('fetch'))) {
        console.warn('Network error or CORS issue fetching custom sheet (falling back):', e);
      } else {
        console.error('Error loading characters sheet', e);
      }
      setIsSheetLoading(false);
      return { 
        success: false, 
        error: e.message || 'Unknown network or parsing error.' 
      };
    }
  };

  // Authenticate Real Google Auth Trigger
  const handleLogin = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      await createOrGetUserProfile(firebaseUser);
      return { success: true };
    } catch (error: any) {
      console.error('Google popup sign in failed:', error);
      const msg = error?.message || String(error);
      const errCode = error?.code || '';
      
      const isPopupError = msg.includes('popup-closed-by-user') || 
                           msg.includes('popup-blocked') || 
                           msg.includes('cancelled-by-user') ||
                           msg.includes('cancelled-popup-request');

      if (errCode === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        return {
          success: false,
          error: 'Domain goalspire.top is not authorized in your Firebase project! Please open your Firebase Console, click "Authentication" on the left menu, select the "Settings" tab, find "Authorized Domains", and add "goalspire.top" and "www.goalspire.top" to allow users to sign in.'
        };
      }
      
      return {
        success: false,
        error: isPopupError
          ? 'The Google Sign-In popup was closed, blocked, or canceled by your browser. E.g. inside an iframe preview, browsers block popups. To login successfully, please click the "Open in new tab" icon (top-right of this window) and sign in there!'
          : msg
      };
    }
  };

  // Sign out Real reset
  const handleLogout = async () => {
    try {
      // Clear localStorage records before signOut to avoid onAuthStateChanged race conditions
      localStorage.removeItem('username');
      localStorage.removeItem('avatar');
      localStorage.removeItem('bestStreak');
      localStorage.removeItem('gamesPlayed');
      localStorage.removeItem('correctGuesses');
      localStorage.removeItem('totalGuesses');
      localStorage.removeItem('favoriteUniverse');
      localStorage.removeItem('mode_goals');
      localStorage.removeItem('mode_assists');
      localStorage.removeItem('mode_gAndA');
      
      await signOut(auth);
      
      let currentGuestId = localStorage.getItem('guestId');
      if (!currentGuestId || !/^GuestUser\d{5}$/.test(currentGuestId)) {
        const randNum = Math.floor(10000 + Math.random() * 90000);
        currentGuestId = `GuestUser${randNum}`;
        localStorage.setItem('guestId', currentGuestId);
      }
      localStorage.setItem('username', currentGuestId);

      setUser({
        isGuest: true,
        guestId: currentGuestId,
        username: currentGuestId,
        avatar: currentGuestId.slice(0, 2).toUpperCase(),
        joinedDate: new Date().toLocaleDateString(),
        isAdmin: false,
      });
      
      setStats({
        bestStreak: 0,
        gamesPlayed: 0,
        correctGuesses: 0,
        totalGuesses: 0,
        favoriteUniverse: 'Goals',
      });
    } catch (error) {
      console.error('Firebase Auth sign out failed:', error);
    }
  };

  const handleResetStats = () => {
    localStorage.setItem('bestStreak', '0');
    localStorage.setItem('gamesPlayed', '0');
    localStorage.setItem('correctGuesses', '0');
    localStorage.setItem('totalGuesses', '0');
    localStorage.setItem('mode_goals', '0');
    localStorage.setItem('mode_assists', '0');
    localStorage.setItem('mode_gAndA', '0');
    localStorage.setItem('favoriteUniverse', 'Goals');
    setStats({
      bestStreak: 0,
      gamesPlayed: 0,
      correctGuesses: 0,
      totalGuesses: 0,
      favoriteUniverse: 'Goals',
    });
  };

  // Change username directly in Firestore backwall
  const handleUpdateUsername = async (newName: string): Promise<boolean> => {
    try {
      const isTaken = await checkIfUsernameTaken(newName, auth.currentUser ? auth.currentUser.uid : null);
      if (isTaken) {
        return false;
      }

      // Preserve any emoji avatar if they have set one
      const prevAvatar = user.avatar || '';
      const isEmoji = prevAvatar && (prevAvatar.length <= 4 && !/^[a-zA-Z0-9]{2}$/.test(prevAvatar));
      const avatar = isEmoji ? prevAvatar : newName.slice(0, 2).toUpperCase();
      
      localStorage.setItem('username', newName);
      localStorage.setItem('avatar', avatar);
      
      setUser(prev => ({
        ...prev,
        username: newName,
        avatar,
      }));
      
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          username: newName,
          avatar: avatar,
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
      return false;
    }
  };

  const handleUpdateBio = async (newBio: string): Promise<boolean> => {
    try {
      localStorage.setItem('bio', newBio);
      setUser(prev => ({
        ...prev,
        bio: newBio,
      }));
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          bio: newBio,
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
      return false;
    }
  };

  const handleUpdateAvatar = async (newAvatar: string): Promise<boolean> => {
    try {
      localStorage.setItem('avatar', newAvatar);
      setUser(prev => ({
        ...prev,
        avatar: newAvatar,
      }));
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          avatar: newAvatar,
          updatedAt: serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser?.uid}`);
      return false;
    }
  };

  // Real database dynamic comment injection
  const handleAddComment = async (charId: string, text: string, replyToCommentId?: string) => {
    const commenterName = user.username || user.guestId;
    const authorUid = auth.currentUser?.uid || user.guestId;

    try {
      let replyToUsername: string | undefined = undefined;
      let finalCommentText = text;

      if (replyToCommentId) {
        // Find main comment document inside Firestore 'comments' collection
        const docRef = doc(db, 'comments', replyToCommentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const detail = docSnap.data();
          replyToUsername = detail.username;
          if (replyToUsername && !text.startsWith(`@${replyToUsername}`)) {
            finalCommentText = `@${replyToUsername} ` + text;
          }
        }
      }

      // Place complete new comment document
      const newDocId = 'com_' + Math.floor(100000 + Math.random() * 900000);
      const docRef = doc(db, 'comments', newDocId);
      
      await setDoc(docRef, {
        commentId: newDocId,
        characterId: charId,
        userId: authorUid,
        username: commenterName,
        text: finalCommentText,
        upvotes: 0,
        downvotes: 0,
        timestamp: Date.now(),
        likedBy: [],
        dislikedBy: [],
        replyToUsername: replyToUsername || null
      });
    } catch (error) {
      const pathTarget = replyToCommentId ? `comments/${replyToCommentId}` : 'comments/new';
      handleFirestoreError(error, OperationType.WRITE, pathTarget);
    }
  };

  // Real Firestore Upvote increments
  const handleUpvoteComment = async (charId: string, commentId: string) => {
    const currentUid = auth.currentUser?.uid || user.guestId;
    try {
      const docRef = doc(db, 'comments', commentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const detail = docSnap.data();
        let likedBy = detail.likedBy || [];
        let upvotesCount = detail.upvotes || 0;
        let dislikedBy = detail.dislikedBy || [];
        let downvotesCount = detail.downvotes || 0;

        if (likedBy.includes(currentUid)) {
          likedBy = likedBy.filter((id: string) => id !== currentUid);
          upvotesCount = Math.max(0, upvotesCount - 1);
        } else {
          likedBy.push(currentUid);
          upvotesCount += 1;
          // Remove dislike if present
          if (dislikedBy.includes(currentUid)) {
            dislikedBy = dislikedBy.filter((id: string) => id !== currentUid);
            downvotesCount = Math.max(0, downvotesCount - 1);
          }
        }

        await updateDoc(docRef, {
          likedBy,
          upvotes: upvotesCount,
          dislikedBy,
          downvotes: downvotesCount
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  // Real Firestore Downvote increments
  const handleDownvoteComment = async (charId: string, commentId: string) => {
    const currentUid = auth.currentUser?.uid || user.guestId;
    try {
      const docRef = doc(db, 'comments', commentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const detail = docSnap.data();
        let likedBy = detail.likedBy || [];
        let upvotesCount = detail.upvotes || 0;
        let dislikedBy = detail.dislikedBy || [];
        let downvotesCount = detail.downvotes || 0;

        if (dislikedBy.includes(currentUid)) {
          dislikedBy = dislikedBy.filter((id: string) => id !== currentUid);
          downvotesCount = Math.max(0, downvotesCount - 1);
        } else {
          dislikedBy.push(currentUid);
          downvotesCount += 1;
          // Remove like if present
          if (likedBy.includes(currentUid)) {
            likedBy = likedBy.filter((id: string) => id !== currentUid);
            upvotesCount = Math.max(0, upvotesCount - 1);
          }
        }

        await updateDoc(docRef, {
          likedBy,
          upvotes: upvotesCount,
          dislikedBy,
          downvotes: downvotesCount
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  // Redirect callback from click inside Play cards to expansive community debate card
  const handleNavigateToCommunity = (charId?: string) => {
    if (charId) {
      navigateTo(`/post/${charId}`);
    } else {
      navigateTo('/community');
    }
  };

  return (
    <div className="min-h-screen bg-bg text-primary relative overflow-x-hidden select-none">
      
      {/* Cinematic noise ambient overlay */}
      <svg className="pointer-events-none fixed inset-0 opacity-[0.012] dark:opacity-[0.024] z-[99] w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>

      {/* FIXED NAVBAR HEADER (Desktop view) */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b border-primary-border/60 backdrop-blur-md px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Brand Left */}
        <div className="flex items-center gap-3 text-left">
          {logoUrl ? (
            <img 
              src={getDirectImageUrl(logoUrl)} 
              alt="GoalSpire Logo" 
              className="h-10 w-auto max-w-[160px] object-contain rounded-lg hover:scale-105 transition-transform duration-200" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              {/* Custom Logo at front */}
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E8472A] to-[#ff6b52] flex items-center justify-center text-white shadow-md shadow-[#E8472A]/20 transform hover:scale-105 transition-transform duration-200">
                <Trophy className="w-5 h-5 text-white" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>
              
              <div className="flex flex-col text-left leading-none">
                <span className="font-display text-2xl font-black tracking-tighter text-primary select-none">
                  GoalSpire
                </span>
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">
                  Play. Debate. Rank up.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Navigation Middle Tabs (Visible on screens >= md) */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          <button
            id="tab_play"
            onClick={() => {
              playClickSound(soundVolume);
              navigateTo('/');
            }}
            className={`relative py-5 font-sans font-extrabold text-xs tracking-widest uppercase transition-all ${
              activeTab === 'play' && !currentPath.startsWith('/player/')
                ? 'text-primary border-b-2 border-[#E8472A]'
                : 'text-secondary hover:text-primary'
            }`}
          >
            PLAY
          </button>

          <button
            id="tab_community"
            onClick={() => {
              playClickSound(soundVolume);
              navigateTo('/community');
            }}
            className={`relative py-5 font-sans font-extrabold text-xs tracking-widest uppercase transition-all ${
              activeTab === 'community'
                ? 'text-primary border-b-2 border-[#E8472A]'
                : 'text-secondary hover:text-primary'
            }`}
          >
            COMMUNITY
          </button>

          <button
            id="tab_profile"
            onClick={() => {
              playClickSound(soundVolume);
              navigateTo('/profile');
            }}
            className={`relative py-5 font-sans font-extrabold text-xs tracking-widest uppercase transition-all ${
              activeTab === 'profile'
                ? 'text-primary border-b-2 border-[#E8472A]'
                : 'text-secondary hover:text-primary'
            }`}
          >
            PROFILE
          </button>


        </nav>

        {/* Right Corner: Theme Toggle & Mini auth profile */}
        <div className="flex items-center gap-4 text-[#F0F0F0]">
          
          {/* Flame streak */}
          <div className="flex items-center gap-1.5 bg-[#1F1F27] border border-white/10 px-2.5 py-1.5 rounded-full" title="Personal Best Streak">
            <span className="text-[#F5C842]">🔥</span>
            <span className="font-display font-black text-xs text-[#F5C842]">{stats.bestStreak}</span>
          </div>

          {/* Settings Button */}
          <button
            id="theme_toggle_btn"
            onClick={() => {
              navigateTo('/settings');
            }}
            className={`w-9 h-9 items-center justify-center flex rounded-full border border-primary-border hover:bg-card-hover text-secondary hover:text-primary transition-all active:scale-90 ${
              activeTab === 'settings' ? 'bg-[#E8472A]/15 text-[#E8472A] border-[#E8472A]' : ''
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User mini box */}
          <div
            onClick={() => navigateTo('/profile')}
            className="w-10 h-10 rounded-full bg-[#E8472A] flex items-center justify-center font-display text-xs font-bold text-white cursor-pointer select-none border border-white/10 hover:scale-105 active:scale-95 transition-all"
            title={user.username || user.guestId}
          >
            {user.avatar || 'G'}
          </div>

        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION TRACK BAR (Visible on < md) */}
      <nav className="fixed md:hidden bottom-0 left-0 right-0 h-16 bg-zinc-950/95 border-t border-white/10 backdrop-blur-md px-6 flex items-center justify-around z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.5)]">
        <button
          onClick={() => {
            playClickSound(soundVolume);
            navigateTo('/');
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-250 relative ${
            activeTab === 'play' && !currentPath.startsWith('/player/')
              ? 'text-[#E8472A] bg-[#E8472A]/10 font-bold scale-105 shadow-[inset_0_1px_2px_rgba(232,71,42,0.1)]' 
               : 'text-zinc-450 hover:text-zinc-200'
          }`}
        >
          {activeTab === 'play' && !currentPath.startsWith('/player/') && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E8472A] rounded-b-full shadow-[0_1px_10px_rgba(232,71,42,0.8)]" />
          )}
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-sans tracking-wide">Play</span>
        </button>

        <button
          onClick={() => {
            playClickSound(soundVolume);
            navigateTo('/community');
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-250 relative ${
            activeTab === 'community' 
              ? 'text-[#E8472A] bg-[#E8472A]/10 font-bold scale-105 shadow-[inset_0_1px_2px_rgba(232,71,42,0.1)]' 
              : 'text-zinc-450 hover:text-zinc-200'
          }`}
        >
          {activeTab === 'community' && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E8472A] rounded-b-full shadow-[0_1px_10px_rgba(232,71,42,0.8)]" />
          )}
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-sans tracking-wide">Community</span>
        </button>

        <button
          onClick={() => {
            playClickSound(soundVolume);
            navigateTo('/profile');
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-250 relative ${
            activeTab === 'profile' 
              ? 'text-[#E8472A] bg-[#E8472A]/10 font-bold scale-105 shadow-[inset_0_1px_2px_rgba(232,71,42,0.1)]' 
              : 'text-zinc-450 hover:text-zinc-200'
          }`}
        >
          {activeTab === 'profile' && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-[#E8472A] rounded-b-full shadow-[0_1px_10px_rgba(232,71,42,0.8)]" />
          )}
          <User className="w-5 h-5" />
          <span className="text-[10px] font-sans tracking-wide">Profile</span>
        </button>
      </nav>

      {/* RENDER CURRENT ACTIVE VIEWPORT */}
      <main className="mb-16 md:mb-0 transition-opacity duration-300">
        {currentPath.startsWith('/player/') ? (
          <PlayerScreen
            playerId={currentPath.split('/player/')[1]}
            characters={characters}
            threads={mergedThreads}
            onNavigateToPost={(pId) => navigateTo(`/post/${pId}`)}
            onNavigateToPlayer={(pId) => navigateTo(`/player/${pId}`)}
            onBack={() => navigateTo('/')}
          />
        ) : (
          <>
            {activeTab === 'play' && (
              <PlayScreen
                characters={characters}
                comments={comments}
                user={user}
                bestStreak={stats.bestStreak}
                stats={stats}
                streak={streak}
                setStreak={setStreak}
                soundVolume={soundVolume}
                onNavigateToCommunity={handleNavigateToCommunity}
                onUpdateStats={handleUpdateStats}
                onCustomSheetLoad={(url) => fetchGoogleSheetData(url, !!user.isAdmin)}
                sheetUrl={sheetUrl}
                isSheetLoading={isSheetLoading}
                theme={theme}
              />
            )}

            {activeTab === 'community' && (
              <CommunityScreen
                characters={characters}
                comments={comments}
                user={user}
                onAddComment={handleAddComment}
                onUpvoteComment={handleUpvoteComment}
                initialSelectedCharId={communityExpandTargetCharId}
                onPathChange={(p) => setCurrentPath(p)}
                onNavigateToUser={(u) => navigateTo(`/user/${u}`)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileScreen
                user={user}
                stats={stats}
                comments={comments}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onUpdateUsername={handleUpdateUsername}
                onUpdateBio={handleUpdateBio}
                checkIfUsernameTaken={checkIfUsernameTaken}
                searchUserByUsername={searchUserByUsername}
                logoUrl={logoUrl}
                initialViewedUsername={viewedUserUsername}
                onUpdateAvatar={handleUpdateAvatar}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsScreen
                theme={theme}
                onThemeToggle={() => {
                  playClickSound(soundVolume);
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                }}
                user={user}
                feedbackEmail={feedbackEmail}
                onUpdateFeedbackEmail={handleUpdateFeedbackEmail}
                soundVolume={soundVolume}
                onSoundVolumeChange={handleSoundVolumeChange}
              />
            )}
          </>
        )}
      </main>

    </div>
  );
}
