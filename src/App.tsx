/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { Sparkles, Medal, User, Flame, Moon, Sun, MessageSquare, Compass, Settings, CircleDot, Trophy } from 'lucide-react';
import { Character, Comment, User as UserType, UserStats, ReplyComment } from './types.ts';
import { DEFAULT_CHARACTERS, PRE_SEEDED_COMMENTS } from './data.ts';

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

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'play' | 'community' | 'profile' | 'settings'>('play');
  
  // Secondary target to auto-activate inside Community Tab on redirect
  const [communityExpandTargetCharId, setCommunityExpandTargetCharId] = useState<string | undefined>(undefined);

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

  // Authenticated user store
  const [user, setUser] = useState<UserType>(() => {
    // Check local guest/username records
    let guestId = localStorage.getItem('guestId');
    if (!guestId) {
      guestId = 'Guest_' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('guestId', guestId);
    }

    const savedUsername = localStorage.getItem('username');
    const savedAvatar = localStorage.getItem('avatar');
    const savedJoined = localStorage.getItem('joined_date') || new Date().toLocaleDateString();

    return {
      isGuest: !savedUsername,
      guestId,
      username: savedUsername,
      avatar: savedAvatar || (savedUsername ? savedUsername.slice(0, 2).toUpperCase() : 'G'),
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

  // Live Comments debate index
  const [comments, setComments] = useState<Record<string, Comment[]>>({});

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
      if (querySnapshot.empty) {
        return null;
      }
      
      let foundDoc: any = null;
      querySnapshot.forEach((doc) => {
        foundDoc = { id: doc.id, ...doc.data() };
      });
      
      if (!foundDoc) return null;
      
      const searchedUser: UserType = {
        uid: foundDoc.id,
        isGuest: false,
        guestId: 'Guest_' + foundDoc.id.slice(0, 4),
        username: foundDoc.username,
        avatar: foundDoc.avatar || '🏆',
        joinedDate: foundDoc.joinedDate || 'Unknown',
        isAdmin: !!foundDoc.isAdmin,
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

  const generateUniqueUsername = async (baseName: string): Promise<string> => {
    let clean = baseName.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (clean.length < 3) {
      clean = 'Player_' + clean;
    }
    if (clean.length > 15) {
      clean = clean.slice(0, 15);
    }
    
    let candidate = clean;
    let isTaken = await checkIfUsernameTaken(candidate, null);
    let attempts = 0;
    
    while (isTaken && attempts < 20) {
      attempts++;
      const suffix = '_' + Math.floor(100 + Math.random() * 900);
      candidate = clean.slice(0, 20 - suffix.length) + suffix;
      isTaken = await checkIfUsernameTaken(candidate, null);
    }
    return candidate;
  };

  const createOrGetUserProfile = async (firebaseUser: any) => {
    const userId = firebaseUser.uid;
    const userRef = doc(db, 'users', userId);
    
    try {
      const docSnap = await getDoc(userRef);
      const joined = new Date().toLocaleDateString();
      const defaultAvatar = firebaseUser.displayName?.slice(0, 2).toUpperCase() || 'P';
      const isUserAdmin = userId === 'W97e8GcIGObrIiM1G5cRZV4BF3Z2' || 
                          userId === '5V7for1aVtZhIjWCNR4vDfHllOA3' || 
                          firebaseUser.email === 'almahmudemon00@gmail.com';
      
      if (docSnap.exists()) {
        localStorage.removeItem('pending_claimed_username');
        const data = docSnap.data();
        const mergedBest = Math.max(stats.bestStreak, data.bestStreak || 0);
        const mergedPlayed = Math.max(stats.gamesPlayed, data.gamesPlayed || 0);
        const mergedCorrect = Math.max(stats.correctGuesses, data.correctGuesses || 0);
        const mergedTotal = Math.max(stats.totalGuesses, data.totalGuesses || 0);
        
        await updateDoc(userRef, {
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
          username: data.username || firebaseUser.displayName || 'Player_' + userId.slice(0, 4),
          avatar: data.avatar || defaultAvatar,
          joinedDate: data.joinedDate || joined,
          isAdmin: isUserAdmin,
        };
        
        // Save to local storage for persistence across reloads/offline scenarios
        localStorage.setItem('username', finalUser.username);
        localStorage.setItem('avatar', finalUser.avatar);
        localStorage.setItem('bestStreak', mergedBest.toString());
        localStorage.setItem('gamesPlayed', mergedPlayed.toString());
        localStorage.setItem('correctGuesses', mergedCorrect.toString());
        localStorage.setItem('totalGuesses', mergedTotal.toString());

        setUser(finalUser);
        setStats({
          bestStreak: mergedBest,
          gamesPlayed: mergedPlayed,
          correctGuesses: mergedCorrect,
          totalGuesses: mergedTotal,
          favoriteUniverse: data.favoriteUniverse || 'Goals',
        });
      } else {
        const pendingClaimed = localStorage.getItem('pending_claimed_username');
        let uniqueUsername = '';
        if (pendingClaimed) {
          const isTaken = await checkIfUsernameTaken(pendingClaimed, null);
          if (!isTaken) {
            uniqueUsername = pendingClaimed;
          }
          localStorage.removeItem('pending_claimed_username');
        }
        
        if (!uniqueUsername) {
          const baseName = firebaseUser.displayName || 'Player_' + userId.slice(0, 4);
          uniqueUsername = await generateUniqueUsername(baseName);
        }
        
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

        setUser({
          uid: userId,
          isGuest: false,
          guestId: 'Guest_' + userId.slice(0, 4),
          username: uniqueUsername,
          avatar: defaultAvatar,
          joinedDate: joined,
          isAdmin: isUserAdmin,
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
              characterId: charId,
              userId: currentUid,
              username: comment.username,
              text: comment.text,
              upvotes: comment.upvotes,
              timestamp: comment.timestamp,
              replies: comment.replies || []
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
        const charId = data.characterId;
        if (charId) {
          if (!newComments[charId]) {
            newComments[charId] = [];
          }
          newComments[charId].push({
            id: doc.id,
            userId: data.userId || '',
            username: data.username || 'Anonymous',
            text: data.text || '',
            upvotes: data.upvotes || 0,
            timestamp: data.timestamp || Date.now(),
            replies: data.replies || []
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
        const currentGuestId = localStorage.getItem('guestId') || 'Guest_' + Math.floor(1000 + Math.random() * 9000);
        localStorage.setItem('guestId', currentGuestId);
        const savedUsername = localStorage.getItem('username');
        const savedAvatar = localStorage.getItem('avatar');
        
        setUser({
          uid: undefined,
          isGuest: !savedUsername,
          guestId: currentGuestId,
          username: savedUsername,
          avatar: savedAvatar || (savedUsername ? savedUsername.slice(0, 2).toUpperCase() : 'G'),
          joinedDate: localStorage.getItem('joined_date') || new Date().toLocaleDateString(),
          isAdmin: false,
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
      fetchGoogleSheetData(sheetUrl).catch(() => {
        setCharacters(DEFAULT_CHARACTERS);
      });
    } else {
      setCharacters(DEFAULT_CHARACTERS);
    }
  }, [sheetUrl]);

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
  const fetchGoogleSheetData = async (url: string): Promise<{ success: boolean; error?: string }> => {
    setIsSheetLoading(true);
    try {
      let parsedUrl = url.trim();

      if (!parsedUrl) {
        setCharacters(DEFAULT_CHARACTERS);
        setSheetUrl('');
        localStorage.removeItem('custom_sheet_url');
        try {
          await setDoc(doc(db, 'settings', 'global_config'), {
            custom_sheet_url: ''
          });
        } catch (error) {
          console.error('Failed to clear custom sheet URL in Firestore:', error);
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
        try {
          await setDoc(doc(db, 'settings', 'global_config'), {
            custom_sheet_url: parsedUrl
          });
        } catch (error) {
          console.error('Failed to update custom sheet URL in Firestore:', error);
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
      const isPopupError = msg.includes('popup-closed-by-user') || msg.includes('popup-blocked') || msg.includes('cancelled-by-user');
      return {
        success: false,
        error: isPopupError
          ? 'The Google Sign-In popup was closed or blocked by your browser. E.g. inside an iframe preview, browsers block popups. To login successfully, please click the "Open in new tab" icon (top-right of this window) and sign in there!'
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
      
      const currentGuestId = localStorage.getItem('guestId') || 'Guest_' + Math.floor(1000 + Math.random() * 9000);
      setUser({
        isGuest: true,
        guestId: currentGuestId,
        username: null,
        avatar: 'G',
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

      const avatar = newName.slice(0, 2).toUpperCase();
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

  // Real database dynamic comment injection
  const handleAddComment = async (charId: string, text: string, replyToCommentId?: string) => {
    const commenterName = user.username || user.guestId;
    const authorUid = auth.currentUser?.uid || user.guestId;

    try {
      if (replyToCommentId) {
        // Find main comment document inside Firestore 'comments' collection
        const docRef = doc(db, 'comments', replyToCommentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const detail = docSnap.data();
          const listReplies = detail.replies ? [...detail.replies] : [];
          
          const newReply: ReplyComment = {
            id: 'rep_' + Math.floor(100000 + Math.random() * 900000),
            userId: authorUid,
            username: commenterName,
            text,
            timestamp: Date.now(),
            upvotes: 0,
          };
          
          await updateDoc(docRef, {
            replies: [...listReplies, newReply]
          });
        }
      } else {
        // Place complete new comment document
        const newDocId = 'com_' + Math.floor(100000 + Math.random() * 900000);
        const docRef = doc(db, 'comments', newDocId);
        
        await setDoc(docRef, {
          commentId: newDocId,
          characterId: charId,
          userId: authorUid,
          username: commenterName,
          text,
          upvotes: 0,
          timestamp: Date.now(),
          replies: []
        });
      }
    } catch (error) {
      const pathTarget = replyToCommentId ? `comments/${replyToCommentId}` : 'comments/new';
      handleFirestoreError(error, OperationType.WRITE, pathTarget);
    }
  };

  // Real Firestore Upvote increments
  const handleUpvoteComment = async (charId: string, commentId: string, replyId?: string) => {
    try {
      const docRef = doc(db, 'comments', commentId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const detail = docSnap.data();
        if (replyId) {
          // Inside replies list, increment upvotes of matched reply
          const listReplies = (detail.replies || []).map((r: any) => {
            if (r.id === replyId) {
              return { ...r, upvotes: (r.upvotes || 0) + 1 };
            }
            return r;
          });
          await updateDoc(docRef, {
            replies: listReplies
          });
        } else {
          // Increment root comment upvotes
          await updateDoc(docRef, {
            upvotes: (detail.upvotes || 0) + 1
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `comments/${commentId}`);
    }
  };

  // Redirect callback from click inside Play cards to expansive community debate card
  const handleNavigateToCommunity = (charId?: string) => {
    if (charId) {
      setCommunityExpandTargetCharId(charId);
    }
    setActiveTab('community');
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
          {/* Custom Logo at front */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-[#E8472A] to-[#ff6b52] flex items-center justify-center text-white shadow-md shadow-[#E8472A]/20 transform hover:scale-105 transition-transform duration-200">
            <Trophy className="w-5 h-5 text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          
          <div className="flex flex-col text-left leading-none">
            <span className="font-display text-2xl font-black tracking-tighter text-primary select-none">
              Statball
            </span>
            <span className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">
              Play. Debate. Rank up.
            </span>
          </div>
        </div>

        {/* Navigation Middle Tabs (Visible on screens >= md) */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          <button
            id="tab_play"
            onClick={() => {
              setActiveTab('play');
              setCommunityExpandTargetCharId(undefined);
            }}
            className={`relative py-5 font-sans font-extrabold text-xs tracking-widest uppercase transition-all ${
              activeTab === 'play'
                ? 'text-primary border-b-2 border-[#E8472A]'
                : 'text-secondary hover:text-primary'
            }`}
          >
            PLAY
          </button>

          <button
            id="tab_community"
            onClick={() => setActiveTab('community')}
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
              setActiveTab('profile');
              setCommunityExpandTargetCharId(undefined);
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
              setActiveTab('settings');
              setCommunityExpandTargetCharId(undefined);
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
            onClick={() => setActiveTab('profile')}
            className="w-10 h-10 rounded-full bg-[#E8472A] flex items-center justify-center font-display text-xs font-bold text-white cursor-pointer select-none border border-white/10 hover:scale-105 active:scale-95 transition-all"
            title={user.username || user.guestId}
          >
            {user.avatar || 'G'}
          </div>

        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION TRACK BAR (Visible on < md) */}
      <nav className="fixed md:hidden bottom-0 left-0 right-0 h-16 bg-card border-t border-primary-border/60 backdrop-blur-md px-4 flex items-center justify-around z-40">
        <button
          onClick={() => {
            setActiveTab('play');
            setCommunityExpandTargetCharId(undefined);
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-zinc-500 hover:text-primary transition-all ${
            activeTab === 'play' ? 'text-[#E8472A] font-bold' : ''
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-sans">Play</span>
        </button>

        <button
          onClick={() => setActiveTab('community')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-zinc-500 hover:text-primary transition-all ${
            activeTab === 'community' ? 'text-[#E8472A] font-bold' : ''
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-sans">Community</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            setCommunityExpandTargetCharId(undefined);
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-zinc-500 hover:text-primary transition-all ${
            activeTab === 'profile' ? 'text-[#E8472A] font-bold' : ''
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-sans">Profile</span>
        </button>


      </nav>

      {/* RENDER CURRENT ACTIVE VIEWPORT */}
      <main className="mb-16 md:mb-0 transition-opacity duration-300">
        {activeTab === 'play' && (
          <PlayScreen
            characters={characters}
            comments={comments}
            user={user}
            bestStreak={stats.bestStreak}
            onNavigateToCommunity={handleNavigateToCommunity}
            onUpdateStats={handleUpdateStats}
            onCustomSheetLoad={fetchGoogleSheetData}
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
            checkIfUsernameTaken={checkIfUsernameTaken}
            searchUserByUsername={searchUserByUsername}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            theme={theme}
            onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          />
        )}
      </main>

    </div>
  );
}
