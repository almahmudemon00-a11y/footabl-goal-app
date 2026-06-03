/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Trophy, Check, X, RotateCcw, Share2, MessageSquare, AlertCircle, FileText, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import { Character, Comment, User } from '../types.ts';
import { UNIVERSE_COLORS, PRE_SEEDED_COMMENTS } from '../data.ts';

const getCountryFlagEmoji = (countryName: string): string => {
  if (!countryName) return '🏳️';
  const norm = countryName.toLowerCase().trim();
  if (norm.includes('arg') || norm.includes('messi')) return '🇦🇷';
  if (norm.includes('port') || norm.includes('ronaldo')) return '🇵🇹';
  if (norm.includes('braz') || norm.includes('neymar') || norm.includes('pel')) return '🇧🇷';
  if (norm.includes('fran') || norm.includes('mbapp') || norm.includes('zidan')) return '🇫🇷';
  if (norm.includes('span') || norm.includes('spai') || norm.includes('iniest')) return '🇪🇸';
  if (norm.includes('ital') || norm.includes('milan')) return '🇮🇹';
  if (norm.includes('germ') || norm.includes('mull')) return '🇩🇪';
  if (norm.includes('engl') || norm.includes('beckh') || norm.includes('kan') || norm.includes('rooney')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (norm.includes('neth') || norm.includes('holl') || norm.includes('cruyf') || norm.includes('van')) return '🇳🇱';
  if (norm.includes('pol') || norm.includes('lewan')) return '🇵🇱';
  if (norm.includes('egyp') || norm.includes('salah')) return '🇪🇬';
  if (norm.includes('norw') || norm.includes('haala')) return '🇳🇴';
  if (norm.includes('croa') || norm.includes('modr')) return '🇭🇷';
  if (norm.includes('moroc') || norm.includes('hakim')) return '🇲🇦';
  if (norm.includes('urug') || norm.includes('suar')) return '🇺🇾';
  if (norm.includes('swed') || norm.includes('ibra')) return '🇸🇪';
  if (norm.includes('sene') || norm.includes('mané') || norm.includes('mane')) return '🇸🇳';
  if (norm.includes('belg') || norm.includes('hazard') || norm.includes('de bruy')) return '🇧🇪';
  if (norm.includes('turk') || norm.includes('türk') || norm.includes('arda')) return '🇹🇷';
  if (norm.includes('colom') || norm.includes('columb')) return '🇨🇴';
  if (norm.includes('mexic')) return '🇲🇽';
  if (norm.includes('chile') || norm.includes('sanch')) return '🇨🇱';
  if (norm.includes('usa') || norm.includes('unit') || norm.includes('state')) return '🇺🇸';
  if (norm.includes('wales') || norm.includes('bale')) return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
  return '⚽';
};

const getPlayerRarity = (val: number, isLight: boolean = false) => {
  if (val >= 600) {
    return {
      name: 'LEGENDARY',
      bgColor: isLight 
        ? 'bg-gradient-to-b from-[#FFFDF0] via-[#FAF6E3] to-[#F1EA9E]' 
        : 'bg-gradient-to-b from-[#1C1A12] via-[#0E0D09] to-[#050504]',
      color: isLight 
        ? 'from-amber-600 via-amber-700 to-amber-900' 
        : 'from-amber-400 via-yellow-500 to-amber-600',
      text: isLight ? 'text-amber-800' : 'text-amber-400',
      textGlow: isLight 
        ? 'brightness-95 drop-shadow-[0_2px_4px_rgba(217,119,6,0.1)]' 
        : 'brightness-125 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]',
      borderBg: isLight 
        ? 'border-amber-500 shadow-[0_8px_24px_rgba(217,119,6,0.12)]' 
        : 'border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.2)]',
      primaryGlow: 'rgba(251,191,36,0.4)',
      badgeBg: isLight 
        ? 'bg-amber-550/15 text-amber-900 border-amber-600/30' 
        : 'bg-amber-400/10 text-amber-300 border-amber-500/30',
      shieldBg: isLight 
        ? 'from-amber-200/30 via-amber-100/10 to-transparent' 
        : 'from-amber-950/40 via-amber-900/10 to-transparent',
      radialLights: isLight 
        ? 'bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.08)_0%,transparent_70%)]' 
        : 'bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.2)_0%,transparent_70%)]'
    };
  }
  if (val >= 400) {
    return {
      name: 'ELITE',
      bgColor: isLight 
        ? 'bg-gradient-to-b from-[#FAF5FF] via-[#F3E8FF] to-[#E9D5FF]' 
        : 'bg-gradient-to-b from-[#18111E] via-[#0D0911] to-[#040305]',
      color: isLight 
        ? 'from-purple-600 via-fuchsia-700 to-violet-900' 
        : 'from-fuchsia-400 via-purple-500 to-violet-600',
      text: isLight ? 'text-purple-800' : 'text-fuchsia-400',
      textGlow: isLight 
        ? 'brightness-95 drop-shadow-[0_2px_4px_rgba(168,85,247,0.1)]' 
        : 'brightness-125 drop-shadow-[0_0_12px_rgba(217,70,239,0.6)]',
      borderBg: isLight 
        ? 'border-purple-500 shadow-[0_8px_24px_rgba(168,85,247,0.12)]' 
        : 'border-fuchsia-500/50 shadow-[0_0_25px_rgba(168,85,247,0.18)]',
      primaryGlow: 'rgba(168,85,247,0.4)',
      badgeBg: isLight 
        ? 'bg-purple-550/15 text-purple-900 border-purple-600/30' 
        : 'bg-purple-400/10 text-purple-300 border-purple-500/30',
      shieldBg: isLight 
        ? 'from-purple-200/30 via-purple-100/10 to-transparent' 
        : 'from-purple-950/40 via-purple-900/10 to-transparent',
      radialLights: isLight 
        ? 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.08)_0%,transparent_70%)]' 
        : 'bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.2)_0%,transparent_70%)]'
    };
  }
  if (val >= 200) {
    return {
      name: 'RARE',
      bgColor: isLight 
        ? 'bg-gradient-to-b from-[#F0F9FF] via-[#E0F2FE] to-[#BAE6FD]' 
        : 'bg-gradient-to-b from-[#0D1520] via-[#060A10] to-[#020406]',
      color: isLight 
        ? 'from-blue-600 via-cyan-700 to-indigo-900' 
        : 'from-cyan-400 via-blue-500 to-indigo-600',
      text: isLight ? 'text-blue-800' : 'text-cyan-400',
      textGlow: isLight 
        ? 'brightness-95 drop-shadow-[0_2px_4px_rgba(59,130,246,0.1)]' 
        : 'brightness-125 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]',
      borderBg: isLight 
        ? 'border-blue-500 shadow-[0_8px_24px_rgba(59,130,246,0.12)]' 
        : 'border-cyan-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      primaryGlow: 'rgba(59,130,246,0.4)',
      badgeBg: isLight 
        ? 'bg-blue-550/15 text-blue-900 border-blue-600/30' 
        : 'bg-cyan-400/10 text-cyan-300 border-cyan-500/30',
      shieldBg: isLight 
        ? 'from-blue-200/30 via-blue-100/10 to-transparent' 
        : 'from-cyan-950/40 via-blue-900/10 to-transparent',
      radialLights: isLight 
        ? 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]' 
        : 'bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18)_0%,transparent_70%)]'
    };
  }
  return {
    name: 'COMMON',
    bgColor: isLight 
      ? 'bg-gradient-to-b from-[#F9F9F9] via-[#F4F4F5] to-[#E4E4E7]' 
      : 'bg-gradient-to-b from-[#1C1F22] via-[#0F1012] to-[#040505]',
    color: isLight 
      ? 'from-zinc-700 via-zinc-800 to-stone-900' 
      : 'from-slate-400 via-zinc-500 to-slate-600',
    text: isLight ? 'text-zinc-800' : 'text-zinc-300',
    textGlow: isLight 
      ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)]' 
      : 'drop-shadow-[0_0_8px_rgba(212,212,216,0.2)]',
    borderBg: isLight 
      ? 'border-zinc-400 shadow-[0_8px_24px_rgba(0,0,0,0.05)]' 
      : 'border-zinc-700/60 shadow-[0_0_15px_rgba(113,113,122,0.08)]',
    primaryGlow: 'rgba(113,113,122,0.2)',
    badgeBg: isLight 
      ? 'bg-zinc-500/10 text-zinc-900 border-zinc-650/30' 
      : 'bg-zinc-400/10 text-zinc-300 border-zinc-500/30',
    shieldBg: isLight 
      ? 'from-zinc-200/45 via-zinc-100/10 to-transparent' 
      : 'from-zinc-900/80 via-zinc-800/20 to-transparent',
    radialLights: isLight 
      ? 'bg-[radial-gradient(circle_at_center,rgba(113,113,122,0.05)_0%,transparent_70%)]' 
      : 'bg-[radial-gradient(circle_at_center,rgba(113,113,122,0.1)_0%,transparent_70%)]'
  };
};

interface PlayScreenProps {
  characters: Character[];
  comments: Record<string, Comment[]>;
  user: User;
  bestStreak: number;
  onNavigateToCommunity: (charId?: string) => void;
  onUpdateStats: (correct: boolean, nextStreak?: number, mode?: 'goals' | 'assists' | 'gAndA') => void;
  onCustomSheetLoad: (url: string) => Promise<{ success: boolean; error?: string }>;
  sheetUrl: string;
  isSheetLoading: boolean;
  theme: 'light' | 'dark';
}

export default function PlayScreen({
  characters,
  comments,
  user,
  bestStreak,
  onNavigateToCommunity,
  onUpdateStats,
  onCustomSheetLoad,
  sheetUrl,
  isSheetLoading,
  theme
}: PlayScreenProps) {
  // Football Game Modes: 'goals' | 'assists' | 'gAndA'
  const [activeMode, setActiveMode] = useState<'goals' | 'assists' | 'gAndA'>('goals');
  
  // Country & Club filters
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedClub, setSelectedClub] = useState<string>('All');

  // Custom Dropdown open/close states
  const [isModeOpen, setIsModeOpen] = useState<boolean>(false);
  const [isCountryOpen, setIsCountryOpen] = useState<boolean>(false);
  const [isClubOpen, setIsClubOpen] = useState<boolean>(false);

  // References for handling clicking outside to close
  const modeRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLDivElement>(null);
  const clubRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) {
        setIsModeOpen(false);
      }
      if (countryRef.current && !countryRef.current.contains(event.target as Node)) {
        setIsCountryOpen(false);
      }
      if (clubRef.current && !clubRef.current.contains(event.target as Node)) {
        setIsClubOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Game state
  const [leftChar, setLeftChar] = useState<Character | null>(null);
  const [rightChar, setRightChar] = useState<Character | null>(null);
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [userChoice, setUserChoice] = useState<'higher' | 'lower' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showNextBtn, setShowNextBtn] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  
  // Flash feedback and ending flows
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [sessionPairings, setSessionPairings] = useState<string[]>([]);
  
  // CSV Input controls
  const [showSheetInput, setShowSheetInput] = useState<boolean>(false);
  const [tempSheetUrl, setTempSheetUrl] = useState<string>(sheetUrl);
  const [sheetMessage, setSheetMessage] = useState<{ text: string; error: boolean } | null>(null);

  // Helper metric getter
  const getMetricValue = (char: Character, mode: 'goals' | 'assists' | 'gAndA'): number => {
    if (!char) return 0;
    if (mode === 'assists') return char.assists;
    if (mode === 'gAndA') return char.gAndA;
    return char.goals;
  };

  const getMetricName = (mode: 'goals' | 'assists' | 'gAndA'): string => {
    if (mode === 'assists') return 'Assists';
    if (mode === 'gAndA') return 'G+A';
    return 'Goals';
  };

  // Filter countries dynamically
  const countriesList = useMemo(() => {
    const list = new Set<string>();
    characters.forEach(c => {
      if (c.category) list.add(c.category);
    });
    return ['All', ...Array.from(list)];
  }, [characters]);

  // Filter clubs dynamically
  const clubsList = useMemo(() => {
    const list = new Set<string>();
    characters.forEach(c => {
      if (c.universe) list.add(c.universe);
    });
    return ['All', ...Array.from(list)];
  }, [characters]);

  // Compute active subset from filters
  const filteredPool = useMemo(() => {
    let pool = characters;
    if (selectedCountry !== 'All') {
      pool = pool.filter(c => c.category === selectedCountry);
    }
    if (selectedClub !== 'All') {
      pool = pool.filter(c => c.universe === selectedClub);
    }
    return pool;
  }, [characters, selectedCountry, selectedClub]);

  const nextCharacterRef = useRef<Character | null>(null);

  // Boot or Reset Game
  const initGame = (pool = filteredPool) => {
    const leftCandidates = pool.filter(c => getMetricValue(c, activeMode) > 0);
    if (leftCandidates.length === 0 || pool.length < 2) {
      setLeftChar(null);
      setRightChar(null);
      return;
    }
    
    // Shuffle and pick
    const shuffledLefts = [...leftCandidates].sort(() => Math.random() - 0.5);
    let selectedLeft: Character | null = null;
    let selectedRight: Character | null = null;
    
    for (const leftC of shuffledLefts) {
      const leftVal = getMetricValue(leftC, activeMode);
      const rightCandidates = pool.filter(c => 
        c.id !== leftC.id && 
        getMetricValue(c, activeMode) !== leftVal
      );
      if (rightCandidates.length > 0) {
        selectedLeft = leftC;
        selectedRight = rightCandidates[Math.floor(Math.random() * rightCandidates.length)];
        break;
      }
    }
    
    // Match fallback
    if (!selectedLeft || !selectedRight) {
      if (pool.length >= 2) {
        selectedLeft = pool.find(c => getMetricValue(c, activeMode) > 0) || pool[0];
        const rightCandidates = pool.filter(c => c.id !== selectedLeft!.id);
        selectedRight = rightCandidates[0];
      }
    }
    
    if (!selectedLeft || !selectedRight) {
      setLeftChar(null);
      setRightChar(null);
      return;
    }
    
    setLeftChar(selectedLeft);
    setRightChar(selectedRight);
    setIsRevealed(false);
    setUserChoice(null);
    setIsCorrect(null);
    setIsGameOver(false);
    setShowNextBtn(false);
    
    // Cache next round player
    const leftVal = getMetricValue(selectedLeft, activeMode);
    const potentialsForCache = pool.filter(c => 
      c.id !== selectedLeft!.id && 
      c.id !== selectedRight!.id
    );
    if (potentialsForCache.length > 0) {
      const cacheCandidate = potentialsForCache[Math.floor(Math.random() * potentialsForCache.length)];
      nextCharacterRef.current = cacheCandidate;
      const img = new Image();
      img.src = cacheCandidate.imageUrl;
    } else {
      nextCharacterRef.current = null;
    }
  };

  // Re-run setup on filters or active Mode change
  useEffect(() => {
    initGame(filteredPool);
  }, [filteredPool, activeMode]);

  // Submit User Higher / Lower Guess
  const handleGuess = (choice: 'higher' | 'lower') => {
    if (!leftChar || !rightChar || isRevealed) return;
    
    setUserChoice(choice);
    setIsRevealed(true);
    
    const leftCount = getMetricValue(leftChar, activeMode);
    const rightCount = getMetricValue(rightChar, activeMode);
    
    let correct = false;
    if (choice === 'higher') {
      correct = rightCount >= leftCount;
    } else {
      correct = rightCount <= leftCount;
    }
    
    setFlashColor(correct ? 'green' : 'red');
    setIsCorrect(correct);
    
    const nextStreak = correct ? streak + 1 : 0;
    onUpdateStats(correct, nextStreak, activeMode);
    
    const label = getMetricName(activeMode);
    const pairSummary = `${leftChar.name} (${leftCount} ${label}) vs ${rightChar.name} (${rightCount} ${label})`;
    setSessionPairings(prev => [...prev, pairSummary]);
    
    setTimeout(() => {
      setFlashColor(null);
    }, 400);

    if (correct) {
      setStreak(nextStreak);
      setTimeout(() => {
        setShowNextBtn(true);
      }, 1000);
    } else {
      setTimeout(() => {
        setIsGameOver(true);
      }, 1800);
    }
  };

  // Advanced scoring slide forward
  const handleNextRound = () => {
    if (!rightChar) return;
    
    const rightVal = getMetricValue(rightChar, activeMode);
    let resolvedLeft: Character;
    if (rightVal > 0) {
      resolvedLeft = rightChar;
    } else {
      const leftCandidates = filteredPool.filter(c => getMetricValue(c, activeMode) > 0);
      if (leftCandidates.length > 0) {
        resolvedLeft = leftCandidates[Math.floor(Math.random() * leftCandidates.length)];
      } else {
        initGame();
        return;
      }
    }
    
    setLeftChar(resolvedLeft);
    const resolvedLeftVal = getMetricValue(resolvedLeft, activeMode);
    
    // Exclude left character and any with equal stat to avoid draw tiebreaker confusion
    const rightCandidates = filteredPool.filter(c => 
      c.id !== resolvedLeft.id && 
      getMetricValue(c, activeMode) !== resolvedLeftVal
    );
    
    let resolvedRight: Character | null = null;
    
    if (rightCandidates.length > 0) {
      const canUseCache = nextCharacterRef.current && 
        nextCharacterRef.current.id !== resolvedLeft.id &&
        getMetricValue(nextCharacterRef.current, activeMode) !== resolvedLeftVal;
        
      if (canUseCache && nextCharacterRef.current) {
        resolvedRight = nextCharacterRef.current;
      } else {
        resolvedRight = rightCandidates[Math.floor(Math.random() * rightCandidates.length)];
      }
    }
    
    if (resolvedRight) {
      setRightChar(resolvedRight);
      setIsRevealed(false);
      setUserChoice(null);
      setIsCorrect(null);
      setShowNextBtn(false);
      
      const potentials = filteredPool.filter(c => 
        c.id !== resolvedLeft.id && 
        c.id !== resolvedRight!.id
      );
      if (potentials.length > 0) {
        const cached = potentials[Math.floor(Math.random() * potentials.length)];
        nextCharacterRef.current = cached;
        const img = new Image();
        img.src = cached.imageUrl;
      } else {
        nextCharacterRef.current = null;
      }
    } else {
      initGame();
    }
  };

  const handlePlayAgain = () => {
    setStreak(0);
    setSessionPairings([]);
    initGame(filteredPool);
  };

  const handleShare = () => {
    const label = getMetricName(activeMode);
    const text = `⚽ I reached a ${streak} streak comparing Football Stats (${label}) on Football Stats: Higher or Lower! Let's play! ⚽`;
    navigator.clipboard.writeText(text);
    alert('Stats streak invitation copied to clipboard! Share it with friends! 🚀');
  };

  // Google Sheets integration
  const handleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempSheetUrl.trim()) return;
    
    setSheetMessage({ text: 'Connecting & parsing Google Sheets CSV export...', error: false });
    const result = await onCustomSheetLoad(tempSheetUrl);
    
    if (result.success) {
      setSheetMessage({ text: 'Loaded successfully! Football team database updated.', error: false });
      setTimeout(() => {
        setShowSheetInput(false);
      }, 1500);
    } else {
      setSheetMessage({ 
        text: result.error || 'Failed parsing columns. Verify name headers or share settings.', 
        error: true 
      });
    }
  };

  const handleResetToDefault = async () => {
    setSheetMessage({ text: 'Reverting back to default legends database...', error: false });
    const result = await onCustomSheetLoad('');
    if (result.success) {
      setTempSheetUrl('');
      setSheetMessage({ text: 'Reverted successfully!', error: false });
      setTimeout(() => {
        setShowSheetInput(false);
        setSheetMessage(null);
      }, 1500);
    } else {
      setSheetMessage({ text: 'Failed to reset local indices.', error: true });
    }
  };

  const activeComments = useMemo(() => {
    if (!rightChar) return [];
    return comments[rightChar.id] || PRE_SEEDED_COMMENTS[rightChar.id] || [];
  }, [rightChar, comments]);

  const getUnivPill = (univ: string) => {
    return UNIVERSE_COLORS[univ] || UNIVERSE_COLORS['Default'];
  };

  const tragicDecisionLine = useMemo(() => {
    if (sessionPairings.length === 0) return "Match kickoff!";
    return sessionPairings[sessionPairings.length - 1];
  }, [sessionPairings]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] pt-[4.2rem] md:pt-20 pb-3 md:pb-5 px-2.5 md:px-8 max-w-6xl mx-auto flex flex-col justify-between select-none bg-transparent dark:bg-gradient-to-br dark:from-[#0c1220] dark:via-[#04060c] dark:to-[#010204] overflow-hidden">
      
      {/* Ultimate Football Arena Backdrop Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Deep dark luxury vignette outline / light mode stadium blend */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_20%,rgba(0,0,0,0.92)_100%)] dark:block hidden" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_25%,rgba(240,237,232,0.8)_100%)] dark:hidden block" />
        
        {/* Stadium light cone simulations behind cards */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.14)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/4 right-1/4 translate-x-1/2 w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,rgba(232,71,42,0.09)_0%,transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Pitch Lines accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
        
        {/* Pitch floating particles/dust */}
        <div className="absolute bottom-[25%] left-[8%] w-1.5 h-1.5 rounded-full bg-emerald-400/30 blur-[0.5px] animate-bounce" style={{ animationDuration: '5s' }} />
        <div className="absolute top-[20%] right-[12%] w-1 h-1 rounded-full bg-amber-400/30 blur-[0.5px] animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-[35%] right-[25%] w-2 h-2 rounded-full bg-blue-400/20 blur-[1px] animate-bounce" style={{ animationDuration: '7s' }} />
      </div>

      {/* Dynamic Correct/Wrong backdrop flash */}
      <AnimatePresence>
        {flashColor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`fixed inset-0 pointer-events-none z-50 ${
              flashColor === 'green' ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Header: Streak Tracker & Level Meter */}
      <div className="w-full max-w-4xl mx-auto flex flex-row items-center justify-between gap-3 px-3 mb-1.5 md:mb-4 relative z-30 select-none">
        
        {/* Score & Streaks */}
        <div className="flex flex-col items-start text-left">
          <span className="text-[7.5px] md:text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">esports standings</span>
          <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
            <div className="bg-[#E8472A]/10 text-[#E8472A] border border-[#E8472A]/20 px-2 md:px-3 py-0.5 md:py-1 rounded-lg flex items-center gap-1 md:gap-1.5 shadow-md">
              <Flame className="w-3 md:w-3.5 h-3 md:h-3.5 fill-current animate-pulse text-[#FF5D42]" />
              <span className="font-display font-black text-xs md:text-base leading-none">{streak}</span>
              <span className="text-[7px] md:text-[8.5px] font-extrabold uppercase tracking-widest text-[#FF5D42]/95">STREAK</span>
            </div>
            
            <div className="bg-zinc-950/60 text-gold border border-gold/20 px-2 md:px-3 py-0.5 md:py-1 rounded-lg flex items-center gap-1 md:gap-1.5 shadow-md">
              <Trophy className="w-3 md:w-3.5 h-3 md:h-3.5 text-gold fill-gold/20" />
              <span className="font-display font-black text-xs md:text-base leading-none">{bestStreak}</span>
              <span className="text-[7px] md:text-[8.5px] font-extrabold uppercase tracking-widest text-gold/95">BEST</span>
            </div>
          </div>
        </div>

        {/* Level bar progress to showcase esports level indicator */}
        <div className="flex-1 max-w-[120px] xs:max-w-[170px] md:max-w-[220px] flex flex-col items-end text-right">
          <div className="flex justify-between w-full text-[7.5px] md:text-[9px] font-black text-zinc-500 dark:text-zinc-400 mb-0.5 md:mb-1 tracking-wider uppercase">
            <span>LEVEL {Math.max(1, Math.floor(streak / 3) + 1)}</span>
            <span>{(streak % 3)} / 3</span>
          </div>
          <div className="w-full bg-zinc-300/40 dark:bg-zinc-950/80 rounded-full h-1 md:h-1.5 overflow-hidden border border-zinc-200 dark:border-white/5 p-[1px]">
            <motion.div 
              className="bg-gradient-to-r from-amber-500 via-[#FF5D42] to-[#E8472A] h-full rounded-full shadow-[0_0_12px_rgba(232,71,42,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${((streak % 3) / 3) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

      </div>

      {/* Dynamic Game Mode Selectors Bar */}
      <div className="w-full text-center mt-0.5 mb-2 relative z-30 px-3">
        <div className="w-full max-w-xl mx-auto flex bg-zinc-950/95 p-1 rounded-xl border border-white/5 backdrop-blur-xl shadow-2xl gap-1">
          
          <button
            id="game_mode_goals"
            onClick={() => {
              setActiveMode('goals');
              setSelectedCountry('All');
              setSelectedClub('All');
            }}
            className={`flex-1 h-9 md:h-10 px-2 lg:px-4 rounded-lg text-[10px] md:text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none select-none border ${
              activeMode === 'goals'
                ? 'bg-gradient-to-r from-amber-500/10 to-[#FF5D42]/10 text-[#FF5D42] border-[#FF5D42]/45 shadow-[0_0_12px_rgba(255,93,66,0.12)]'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <span>⚽</span>
            <span>Goals</span>
          </button>

          <button
            id="game_mode_assists"
            onClick={() => {
              setActiveMode('assists');
              setSelectedCountry('All');
              setSelectedClub('All');
            }}
            className={`flex-1 h-9 md:h-10 px-2 lg:px-4 rounded-lg text-[10px] md:text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none select-none border ${
              activeMode === 'assists'
                ? 'bg-gradient-to-r from-amber-500/10 to-[#FF5D42]/10 text-[#FF5D42] border-[#FF5D42]/45 shadow-[0_0_12px_rgba(255,93,66,0.12)]'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <span>👟</span>
            <span>Assists</span>
          </button>

          <button
            id="game_mode_gAndA"
            onClick={() => {
              setActiveMode('gAndA');
              setSelectedCountry('All');
              setSelectedClub('All');
            }}
            className={`flex-1 h-9 md:h-10 px-2 lg:px-4 rounded-lg text-[10px] md:text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none select-none border ${
              activeMode === 'gAndA'
                ? 'bg-gradient-to-r from-amber-500/10 to-[#FF5D42]/10 text-[#FF5D42] border-[#FF5D42]/45 shadow-[0_0_12px_rgba(255,93,66,0.12)]'
                : 'bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border-transparent'
            }`}
          >
            <span>🔥</span>
            <span>Total G+A</span>
          </button>

        </div>

        {/* Import custom players (Admin only) */}
        {user.isAdmin && (
          <div className="w-full flex items-center justify-end py-1 max-w-4xl mx-auto select-none">
            <button
              onClick={() => setShowSheetInput(!showSheetInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg border border-white/5 bg-zinc-950/40 transition-all whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3" />
              <span>Import custom players</span>
            </button>
          </div>
        )}

        {/* Custom CSV Upload Box */}
        {showSheetInput && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 mt-2 rounded-xl bg-card border border-primary-border max-w-2xl mx-auto text-left"
          >
            <h4 className="font-sans font-bold text-xs text-primary mb-1 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-gold" /> Upload Custom Football CSV
            </h4>
            <p className="font-sans text-[11px] text-secondary mb-3 leading-relaxed">
              Import custom football ratings from Google Sheets published to the web. 
              The CSV schema requires: <code className="bg-secondary-surface px-1 py-0.5 rounded text-primary">Player Name, Country, Club, Goals, Assists, G+A, Image_url</code> as header tags.
            </p>
            <form onSubmit={handleSheetSubmit} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={tempSheetUrl}
                onChange={(e) => setTempSheetUrl(e.target.value)}
                placeholder="Paste CSV / Google sheet url here"
                className="flex-1 bg-secondary-surface border border-primary-border text-primary rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#E8472A] font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSheetLoading}
                  className="bg-[#E8472A] hover:bg-[#ff5d42] active:scale-95 text-white font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                >
                  {isSheetLoading ? 'Connecting...' : 'Fetch CSV'}
                </button>
                {sheetUrl && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    disabled={isSheetLoading}
                    className="bg-secondary-surface hover:bg-card-hover border border-primary-border text-primary font-sans text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
            {sheetMessage && (
              <p className={`text-[11px] mt-1.5 font-semibold flex items-center ${sheetMessage.error ? 'text-red' : 'text-green'}`}>
                {sheetMessage.error ? <AlertCircle className="inline w-3.5 h-3.5 mr-1" /> : <Check className="inline w-3.5 h-3.5 mr-1" />}
                {sheetMessage.text}
              </p>
            )}
          </motion.div>
        )}

      </div>

      {/* Main Board Arena */}
      {filteredPool.length < 2 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center relative z-20">
          <AlertCircle className="w-10 h-10 text-zinc-600 mb-2" />
          <h2 className="font-display text-lg text-primary mb-1">Not enough players</h2>
          <p className="font-sans text-xs text-secondary mb-3 max-w-sm">
            At least 2 players are required in the filtered collection to play. Please clear filters.
          </p>
          <button
            onClick={() => {
              setSelectedCountry('All');
              setSelectedClub('All');
            }}
            className="px-4 py-1 bg-[#E8472A] hover:bg-[#ff5d42] text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : leftChar && rightChar ? (
        <div className="flex-1 flex flex-col justify-center items-center w-full relative z-20">
          
          <div className="w-full flex flex-row gap-2.5 md:gap-8 items-stretch relative max-w-5xl mx-auto px-1 md:px-0">
            
            {/* LEFT PLAYER CARD - KNOWN BASE REFERENCE */}
            {(() => {
              const leftVal = getMetricValue(leftChar, activeMode);
              const leftRarity = getPlayerRarity(leftVal, theme === 'light');
              return (
                <div 
                  id="character_left_card" 
                  className={`w-full flex-1 aspect-square md:aspect-square ${leftRarity.bgColor} rounded-xl md:rounded-3xl border md:border-2 ${leftRarity.borderBg} overflow-hidden shadow-2xl flex flex-col group relative transition-transform duration-300 hover:scale-[1.01]`}
                >
                  {/* Spotlight Background lighting */}
                  <div className={`absolute inset-0 ${leftRarity.radialLights} pointer-events-none z-0`} />
                  
                  {/* Premium FUT Shield Crest Layout */}
                  <div className="relative w-full h-[69%] md:h-[73%] overflow-hidden bg-gradient-to-b from-transparent to-zinc-950/90 border-b border-white/5 z-10 flex items-center justify-center">
                    
                    {/* Golden stadium backdrop rays */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] mix-blend-overlay" />
                    
                    <img
                      referrerPolicy="no-referrer"
                      src={leftChar.imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${leftChar.id}`}
                      alt={leftChar.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 z-10"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${leftChar.name}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40 z-15 pointer-events-none" />

                    <div className={`absolute top-1.5 md:top-4 left-1.5 md:left-4 z-25 ${leftRarity.badgeBg} backdrop-blur-md text-white px-1 md:px-2.5 py-0.5 font-display text-[6.5px] xs:text-[7.5px] md:text-[9.5px] font-black tracking-widest rounded md:rounded-lg uppercase shadow-md select-none border border-white/10`}>
                      {leftRarity.name}
                    </div>

                    {/* Compact Club & Country pills */}
                    <div className="absolute top-1.5 md:top-4 right-1.5 md:right-4 z-25 flex flex-col gap-0.5 md:gap-1.5 select-none text-right justify-end items-end">
                      <div className="bg-zinc-950/85 backdrop-blur-md px-1 md:px-3 py-0.5 md:py-[5px] rounded-full border border-white/20 flex items-center gap-0.5 md:gap-1.5 shadow-lg max-w-[55px] xs:max-w-[75px] md:max-w-none">
                        <span className="text-[8px] md:text-sm leading-none flex-shrink-0 select-none">🌍</span>
                        <span className="text-[6.5px] xs:text-[7.5px] md:text-[11px] font-bold text-zinc-300 truncate tracking-wide">
                          {leftChar.category}
                        </span>
                      </div>
                      <div className={`bg-zinc-950/90 backdrop-blur-md px-1 md:px-3 py-0.5 md:py-[5px] rounded-full border flex items-center gap-0.5 md:gap-1.5 shadow-lg max-w-[55px] xs:max-w-[75px] md:max-w-none ${getUnivPill(leftChar.universe).border}`}>
                        <span className="text-[8px] md:text-sm leading-none flex-shrink-0 select-none">⚽</span>
                        <span className="text-[6.5px] xs:text-[7.5px] md:text-[11px] font-bold truncate tracking-wide" style={{ color: getUnivPill(leftChar.universe).text }}>
                          {leftChar.universe}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-1 md:bottom-4 left-2 md:left-4 right-2 md:right-4 z-20 text-center select-none pointer-events-none">
                      <h2 className="font-display text-[9px] xs:text-xs md:text-xl lg:text-2xl font-extrabold uppercase italic tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] line-clamp-1">
                        {leftChar.name}
                      </h2>
                    </div>
                  </div>

                  {/* Rating / Stat representation area */}
                  <div className="flex-1 bg-zinc-950/50 backdrop-blur-lg flex flex-col items-center justify-center py-0.5 md:py-1.5 px-2 text-center relative z-20 border-t border-white/5">
                    <span className="block text-[6px] md:text-[8px] text-[#EBEBF5]/40 font-black uppercase tracking-widest mb-0.5 select-none leading-none">
                      {activeMode === 'goals' ? '👉 CAREER GOALS' : activeMode === 'assists' ? '👉 MAESTRO ASSISTS' : '👉 MATCHPLAY G+A'}
                    </span>
                    
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <span className="text-[8px] md:text-base">⚽</span>
                      <span className={`font-display text-[10px] xs:text-sm md:text-3xl lg:text-4xl font-black bg-gradient-to-r ${leftRarity.color} bg-clip-text text-transparent leading-none select-none tracking-tighter ${leftRarity.textGlow}`}>
                        {leftVal}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* CENTRAL VS COMPETING BADGE & CONNECTING GLOW LINES */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none flex items-center justify-center">
              {/* Connected field glow lines */}
              <div className="hidden md:block absolute w-72 h-[2px] bg-gradient-to-r from-transparent via-[#E8472A]/40 to-transparent blur-[1px]" />
              <div className="hidden md:block absolute w-[10rem] h-[1px] bg-gradient-to-r from-transparent via-[#FF5D42]/80 to-transparent" />
              
              <div className="w-8 h-8 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#FF5D42] via-[#E8472A] to-[#A51B06] border-2 md:border-4 border-zinc-950 flex items-center justify-center font-display text-[10px] md:text-lg font-black text-white shadow-[0_0_20px_rgba(232,71,42,0.85)] relative animate-pulse">
                <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-60" />
                <span className="italic tracking-tighter">VS</span>
              </div>
            </div>

            {/* RIGHT PLAYER CARD - MYSTERY CHALLENGER */}
            {(() => {
              const rightVal = getMetricValue(rightChar, activeMode);
              const rightRarity = getPlayerRarity(rightVal, theme === 'light');
              return (
                <div 
                  id="character_right_card" 
                  className={`w-full flex-1 aspect-square md:aspect-square ${rightRarity.bgColor} rounded-xl md:rounded-3xl border md:border-2 ${rightRarity.borderBg} overflow-hidden shadow-2xl flex flex-col group relative transition-transform duration-300 hover:scale-[1.01]`}
                >
                  {/* Spotlight Background lighting */}
                  <div className={`absolute inset-0 ${rightRarity.radialLights} pointer-events-none z-0`} />
                  
                  {/* Premium FUT Shield Crest Layout */}
                  <div className="relative w-full h-[69%] md:h-[73%] overflow-hidden bg-gradient-to-b from-transparent to-zinc-950/90 border-b border-white/5 z-10 flex items-center justify-center">
                    
                    {/* Golden stadium backdrop rays */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_100%)] mix-blend-overlay" />
                    
                    <img
                      referrerPolicy="no-referrer"
                      src={rightChar.imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${rightChar.id}`}
                      alt={rightChar.name}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 z-10"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${rightChar.name}`;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/40 z-15 pointer-events-none" />

                    <div className="absolute top-1.5 md:top-4 left-1.5 md:left-4 z-25 bg-[#2A7AE8] text-white px-1 md:px-2.5 py-0.5 font-display text-[6.5px] xs:text-[7.5px] md:text-[9.5px] font-black tracking-widest rounded md:rounded-lg uppercase shadow-md select-none border border-white/10">
                      CHALLENGER
                    </div>

                    {/* Compact Club & Country pills */}
                    <div className="absolute top-1.5 md:top-4 right-1.5 md:right-4 z-25 flex flex-col gap-0.5 md:gap-1.5 select-none text-right justify-end items-end">
                      <div className="bg-zinc-950/85 backdrop-blur-md px-1 md:px-3 py-0.5 md:py-[5px] rounded-full border border-white/20 flex items-center gap-0.5 md:gap-1.5 shadow-lg max-w-[55px] xs:max-w-[75px] md:max-w-none">
                        <span className="text-[8px] md:text-sm leading-none flex-shrink-0 select-none">🌍</span>
                        <span className="text-[6.5px] xs:text-[7.5px] md:text-[11px] font-bold text-zinc-300 truncate tracking-wide">
                          {rightChar.category}
                        </span>
                      </div>
                      <div className={`bg-zinc-950/90 backdrop-blur-md px-1 md:px-3 py-0.5 md:py-[5px] rounded-full border flex items-center gap-0.5 md:gap-1.5 shadow-lg max-w-[55px] xs:max-w-[75px] md:max-w-none ${getUnivPill(rightChar.universe).border}`}>
                        <span className="text-[8px] md:text-sm leading-none flex-shrink-0 select-none">⚽</span>
                        <span className="text-[6.5px] xs:text-[7.5px] md:text-[11px] font-bold truncate tracking-wide" style={{ color: getUnivPill(rightChar.universe).text }}>
                          {rightChar.universe}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-1 md:bottom-4 left-2 md:left-4 right-2 md:right-4 z-20 text-center select-none pointer-events-none">
                      <h2 className="font-display text-[9px] xs:text-xs md:text-xl lg:text-2xl font-extrabold uppercase italic tracking-tighter text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.95)] line-clamp-1">
                        {rightChar.name}
                      </h2>
                    </div>
                  </div>

                  {/* Rating Section - Question Mark or Shimmering Real Goal matrix */}
                  <div className="flex-1 bg-zinc-950/50 backdrop-blur-lg flex flex-col items-center justify-center py-0.5 md:py-1.5 px-2 text-center relative z-20 border-t border-white/5">
                    <span className="block text-[6px] md:text-[8px] text-[#EBEBF5]/40 font-black uppercase tracking-widest mb-0.5 select-none leading-none">
                      {activeMode === 'goals' ? '👉 CAREER GOALS' : activeMode === 'assists' ? '👉 MAESTRO ASSISTS' : '👉 MATCHPLAY G+A'}
                    </span>
                    
                    <div className="perspective-1000 w-full flex items-center justify-center h-[24px] md:h-[38px]">
                      <AnimatePresence mode="wait">
                        {!isRevealed ? (
                          <motion.div
                            key="front"
                            initial={{ rotateY: 0, scale: 0.9, opacity: 0.8 }}
                            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                            exit={{ rotateY: -180, opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.35 }}
                            className="font-display text-[9px] xs:text-xs md:text-3xl font-black text-zinc-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] select-none tracking-widest"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            ⭐ ? ⭐
                          </motion.div>
                        ) : (
                          <motion.div
                            key="back"
                            initial={{ rotateY: 180, opacity: 0, scale: 0.3 }}
                            animate={{ rotateY: 0, opacity: 1, scale: 1.0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 14, duration: 0.6 }}
                            className="flex items-center gap-1 md:gap-2"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <span className="text-[9px] md:text-xl animate-spin" style={{ animationDuration: '4s' }}>⚽</span>
                            <span className={`font-display text-xs xs:text-base md:text-4xl lg:text-5xl font-black bg-gradient-to-r ${rightRarity.color} bg-clip-text text-transparent leading-none select-none tracking-tighter ${rightRarity.textGlow}`}>
                              {rightVal}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {!isRevealed && (
                      <span className="block text-[6.5px] md:text-[8px] font-black text-amber-500/80 uppercase tracking-widest mt-0.5 animate-pulse">
                        CHOOSE HIGHER OR LOWER
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>

          {/* LOWER/HIGHER ACTION DECISIONS PANEL - ALIGNED & PREMIUM */}
          <div className="w-full max-w-4xl mx-auto mt-2 md:mt-5 px-3 flex flex-col items-center">
            
            <AnimatePresence mode="wait">
              {!isRevealed ? (
                <motion.div
                  key="guess-actions"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="w-full flex flex-row gap-2 max-w-xl px-1"
                >
                  <button
                    id="guess_higher_btn"
                    onClick={() => handleGuess('higher')}
                    className="flex-1 h-10 xs:h-11 md:h-14 bg-gradient-to-r from-[#FF5D42] via-[#E8472A] to-[#C8341A] rounded-xl md:rounded-2xl font-display flex flex-col items-center justify-center border-b-[3px] md:border-b-4 border-red-950/80 hover:-translate-y-0.5 active:scale-[0.98] transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(232,71,42,0.45)] text-white shadow-xl cursor-pointer px-2.5 py-1"
                  >
                    <div className="flex items-center gap-1 font-black text-xs md:text-base tracking-widest">
                      <span>🔺</span>
                      <span>HIGHER</span>
                    </div>
                    <span className="hidden sm:block text-[9px] md:text-[10px] uppercase font-sans font-bold text-white/90 tracking-wider mt-0.5">
                      Challenger is higher than base ref
                    </span>
                  </button>

                  <button
                    id="guess_lower_btn"
                    onClick={() => handleGuess('lower')}
                    className="flex-1 h-10 xs:h-11 md:h-14 bg-gradient-to-r from-[#4E94FF] via-[#2A7AE8] to-[#145CBE] rounded-xl md:rounded-2xl font-display flex flex-col items-center justify-center border-b-[3px] md:border-b-4 border-blue-950/80 hover:-translate-y-0.5 active:scale-[0.98] transition-all hover:brightness-110 hover:shadow-[0_0_20px_rgba(42,122,232,0.45)] text-white shadow-xl cursor-pointer px-2.5 py-1"
                  >
                    <div className="flex items-center gap-1 font-black text-xs md:text-base tracking-widest">
                      <span>🔻</span>
                      <span>LOWER</span>
                    </div>
                    <span className="hidden sm:block text-[9px] md:text-[10px] uppercase font-sans font-bold text-white/90 tracking-wider mt-0.5">
                      Challenger is lower than base ref
                    </span>
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="result-overlay"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full bg-zinc-950/90 border border-white/10 p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-2xl flex flex-col items-center gap-2 max-w-md mx-auto relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  
                  <div className="flex items-center gap-3 relative z-10 w-full text-left">
                    {isCorrect ? (
                      <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-green/10 text-green border border-green/30 flex justify-center items-center shadow-lg">
                        <Check className="w-5 h-5 md:w-7 md:h-7 stroke-[3.5]" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-red/10 text-red border border-red/30 flex justify-center items-center shadow-lg">
                        <X className="w-5 h-5 md:w-7 md:h-7 stroke-[3.5]" />
                      </div>
                    )}
                    <div>
                      <h4 className={`font-sans font-black text-[10px] md:text-sm tracking-wider uppercase ${isCorrect ? 'text-green text-glow' : 'text-red'}`}>
                        {isCorrect ? '🏆 TACTICAL MASTERCLASS!' : '💔 BLUNDER OF THE SEASON!'}
                      </h4>
                      <p className="font-sans text-[9px] md:text-xs text-zinc-300 font-medium">
                        {isCorrect ? `Live streak extended to ${streak} hits 🔥` : `Decision failure! Streak has been fully reset.`}
                      </p>
                    </div>
                  </div>

                  {isCorrect && showNextBtn && (
                    <motion.button
                      id="next_round_btn"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      onClick={handleNextRound}
                      className="w-full bg-gradient-to-r from-amber-500 to-[#E8472A] hover:from-amber-400 hover:to-[#ff5c3e] text-white py-2 md:py-3 px-4 rounded-lg md:rounded-xl font-sans font-black text-[10px] md:text-xs tracking-widest uppercase transition-all shadow-lg active:scale-97 flex items-center justify-center gap-1.5 cursor-pointer mt-0.5 relative z-10"
                    >
                      <span>NEXT CONTESTANT</span>
                      <Sparkles className="w-3.5 h-3.5 text-white animate-spin" style={{ animationDuration: '6s' }} />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comments Debate Panel */}
            <AnimatePresence>
              {isRevealed && activeComments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.2 }}
                  className="hidden md:flex w-full bg-zinc-950/70 border border-white/5 p-4 rounded-3xl mt-6 flex-col gap-3 backdrop-blur-md"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="font-sans font-black text-[10px] tracking-widest text-[#E8472A] uppercase flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" /> community debate boards
                    </span>
                    <button
                      onClick={() => onNavigateToCommunity(rightChar.id)}
                      className="font-sans font-bold text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Compare & Debate stats →
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto">
                    {activeComments.slice(0, 2).map((comment) => (
                      <div 
                        key={comment.id} 
                        onClick={() => onNavigateToCommunity(rightChar.id)}
                        className="text-left bg-zinc-900/40 p-2.5 rounded-xl border border-white/5 hover:border-white/10 hover:bg-zinc-900/60 transition-all cursor-pointer select-none"
                        title="Click to view original debate thread"
                      >
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-extrabold text-[11px] text-amber-200/90 tracking-wide">🏆 {comment.username}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">👍 {comment.upvotes} UPVOTES</span>
                        </div>
                        <p className="font-sans text-xs text-zinc-300 leading-relaxed italic">"{comment.text}"</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center py-24 z-20 relative">
          <div className="w-12 h-12 rounded-full border-4 border-[#E8472A] border-t-transparent animate-spin mb-4" />
          <h2 className="font-display text-base font-black uppercase text-secondary animate-pulse tracking-widest text-[#E8472A]">Prepping match setup...</h2>
        </div>
      )}

      {/* GAME OVER CARD OVERLAY */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/70 z-55 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-gradient-to-b from-[#14151B]/90 to-[#0D0D11]/90 border border-white/10 rounded-2xl p-4 md:p-6 max-w-[310px] md:max-w-sm w-full text-center relative shadow-2xl shadow-black overflow-hidden backdrop-blur-md"
            >
              {/* Golden circular arena light behind game over card */}
              <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(232,71,42,0.12)_0%,transparent_70%)] blur-xl" />

              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-black flex justify-center items-center shadow-lg shadow-amber-500/20">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 font-black animate-bounce" />
              </div>

              <h2 className="font-display text-xl md:text-2xl text-primary font-black mt-3 md:mt-4 tracking-tight italic">FULL TIME!</h2>
              <p className="font-sans text-[8px] md:text-[9px] text-zinc-550 tracking-widest uppercase mb-3 md:mb-5 font-black">tactical blunder review</p>

              <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-5">
                <div className="bg-zinc-950/80 p-2.5 md:p-3 rounded-xl border border-white/5">
                  <span className="font-sans text-[8px] md:text-[9px] text-zinc-400 uppercase block tracking-wider font-bold">STREAK SCORE</span>
                  <span className="font-display text-2xl md:text-3xl text-[#E8472A] font-black mt-0.5 block tracking-tighter">{streak}</span>
                </div>
                <div className="bg-zinc-950/80 p-2.5 md:p-3 rounded-xl border border-white/5">
                  <span className="font-sans text-[8px] md:text-[9px] text-zinc-400 uppercase block tracking-wider font-bold">PERSONAL BEST</span>
                  <span className="font-display text-2xl md:text-3xl text-[#F5C842] font-black mt-0.5 block tracking-tighter">{bestStreak}</span>
                </div>
              </div>

              <div className="bg-zinc-950/50 border border-white/5 p-2.5 md:p-3 rounded-xl text-left mb-4 md:mb-5">
                <span className="font-sans text-[8px] md:text-[9px] text-[#FF5D42] uppercase tracking-widest block mb-0.5 font-black">CRITICAL FAILURE MATCH</span>
                <p className="font-sans text-[11px] md:text-xs text-zinc-300 font-semibold tracking-tight leading-snug">
                  {tragicDecisionLine}
                </p>
              </div>

              <div className="flex flex-col gap-2 relative z-10 p-0.5">
                <button
                  id="game_over_play_again"
                  onClick={handlePlayAgain}
                  className="w-full h-10 md:h-11 bg-gradient-to-r from-[#FF5D42] to-[#E8472A] hover:brightness-110 active:scale-97 text-white font-sans font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
                  <span>PLAY NEXT ROUND</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
