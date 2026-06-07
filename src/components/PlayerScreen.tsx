import React, { useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Trophy, 
  MessageSquare, 
  Share2, 
  ExternalLink,
  Smartphone,
  ChevronRight,
  TrendingUp,
  Award,
  Link as LinkIcon
} from 'lucide-react';
import { Character, Thread } from '../types.ts';
import { updateSEOMetadata } from '../utils/seo.ts';

interface PlayerScreenProps {
  playerId: string;
  characters: Character[];
  threads: Thread[];
  onNavigateToPost: (postId: string) => void;
  onNavigateToPlayer: (playerId: string) => void;
  onBack: () => void;
}

export default function PlayerScreen({
  playerId,
  characters,
  threads,
  onNavigateToPost,
  onNavigateToPlayer,
  onBack
}: PlayerScreenProps) {
  // Find player target based on ID (case-insensitive handle helper)
  const player = useMemo(() => {
    return characters.find(
      c => c.id.toLowerCase() === playerId.toLowerCase() || c.name.toLowerCase().includes(playerId.toLowerCase())
    );
  }, [playerId, characters]);

  // Handle auto-SEO dynamic tracking
  useEffect(() => {
    if (player) {
      const pageTitle = `${player.name} Career Stats & Community Debates | GoalSpire`;
      const pageDesc = `Explore ${player.name}'s legendary football record on GoalSpire: ${player.goals} goals, ${player.assists} assists, and ${player.gAndA} goal contributions. Join the fans debate!`;
      const canonicalUrl = `https://goalspire.com/player/${player.id}`;
      const ogImg = player.imageUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=400';

      // Structured Data Schema for Search Indexing
      const playerSchema = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": player.name,
        "description": `Professional football statistics and user debate results for ${player.name}.`,
        "image": ogImg,
        "jobTitle": "Professional Athlete",
        "memberOf": {
          "@type": "SportsOrganization",
          "name": player.universe // Club name mapped here
        },
        "nationality": {
          "@type": "Country",
          "name": player.category // Country/Category mapped here
        },
        "mainEntityOfPage": canonicalUrl,
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": "https://schema.org/CommentAction",
          "userInteractionCount": threads.length
        }
      };

      updateSEOMetadata({
        title: pageTitle,
        description: pageDesc,
        canonicalUrl,
        ogTitle: pageTitle,
        ogDescription: pageDesc,
        ogImage: ogImg,
        structuredData: playerSchema
      });
    }
  }, [player, threads]);

  // Related Discussion Filters
  const relatedThreads = useMemo(() => {
    if (!player) return [];
    const searchTerms = [
      player.name.toLowerCase(), 
      player.id.toLowerCase(), 
      player.category.toLowerCase(), 
      player.universe.toLowerCase()
    ];
    return threads.filter(t => {
      const title = t.title.toLowerCase();
      const desc = t.description?.toLowerCase() || '';
      const cat = t.category.toLowerCase();
      return searchTerms.some(term => title.includes(term) || desc.includes(term) || cat.includes(term));
    });
  }, [player, threads]);

  // Quick fallback suggestions for internal cross-linking
  const suggestedPlayers = useMemo(() => {
    if (!player) return [];
    return characters
      .filter(c => c.id !== player.id)
      .slice(0, 5); // display top 5 and feed to search bots
  }, [player, characters]);

  if (!player) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 relative z-10">
        <h2 className="text-2xl font-black font-display text-white">PLAYER NOT FOUND</h2>
        <p className="text-zinc-400 text-sm mt-2 max-w-sm">We couldn't locate any records matching "{playerId}". Browse our complete roster of champions in the home viewport.</p>
        <button
          onClick={onBack}
          className="mt-6 flex items-center gap-2 bg-[#E8472A] hover:bg-[#ff5d42] text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Arena</span>
        </button>
      </div>
    );
  }

  // Calculate goal contribution metric % ratio
  const goalsRatio = player.gAndA > 0 ? Math.round((player.goals / player.gAndA) * 100) : 100;
  const assistsRatio = 100 - goalsRatio;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard for index sharing!');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 relative z-20 select-text">
      {/* Upper Navigation Bar */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/40 border border-zinc-800/60 px-4 py-2 rounded-xl text-xs md:text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return</span>
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors bg-zinc-900/40 border border-zinc-800/60 px-3 py-2 rounded-xl text-xs"
            title="Share profile URL"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Hand: Player Futuristic Fut Shield Card */}
        <div className="columns-1 lg:col-span-5 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-[310px] aspect-[3/4.2] rounded-3xl overflow-hidden bg-[#0c1220]/95 border-2 border-amber-500/30 p-2 shadow-[0_15px_40px_rgba(0,0,0,0.8),_inset_0_1px_3px_rgba(255,255,255,0.1)] relative group select-none"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.08)_0%,transparent_75%)]" />
            
            {/* Top Badge */}
            <div className="absolute top-4 left-4 z-20 bg-amber-500/20 backdrop-blur-md px-2.5 py-1 rounded-md border border-amber-500/30 text-amber-400 font-display text-[9px] font-black uppercase tracking-widest shadow-sm">
              SUPERSTAR
            </div>

            {/* Club Pillar indicator */}
            <div className="absolute top-4 right-4 z-20 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide">{player.universe}</span>
            </div>

            {/* Profile Avatar Image */}
            <div className="relative w-full h-[65%] overflow-hidden bg-gradient-to-b from-transparent to-zinc-950/90 rounded-2xl border border-white/5 flex items-center justify-center">
              <img
                src={player.imageUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${player.id}`}
                alt={player.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${player.name}`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-zinc-950/40" />
              
              <div className="absolute bottom-3 left-3 right-3 text-center">
                <h1 className="font-display text-lg md:text-xl font-extrabold uppercase italic tracking-tighter text-white drop-shadow-md">
                  {player.name}
                </h1>
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{player.category} National Team</p>
              </div>
            </div>

            {/* Detailed Career Matrix */}
            <div className="mt-4 p-3 bg-zinc-900/60 rounded-xl border border-white/5 flex flex-col justify-center">
              <div className="text-[7.5px] font-black text-amber-400 uppercase tracking-widest text-center mb-1.5 flex items-center justify-center gap-1">
                <Trophy className="w-2.5 h-2.5" /> OFFICIAL STATS ARCHIVE
              </div>
              <div className="grid grid-cols-3 gap-1 select-none">
                <div className="bg-zinc-950/40 p-2 rounded-lg border border-white/[0.04] text-center">
                  <span className="block text-[6.5px] text-zinc-500 uppercase tracking-wider font-semibold">Goals</span>
                  <span className="block font-display text-sm font-black text-white mt-0.5">{player.goals}</span>
                </div>
                <div className="bg-zinc-950/40 p-2 rounded-lg border border-white/[0.04] text-center">
                  <span className="block text-[6.5px] text-zinc-500 uppercase tracking-wider font-semibold">Assists</span>
                  <span className="block font-display text-sm font-black text-white mt-0.5">{player.assists}</span>
                </div>
                <div className="bg-zinc-950/40 p-2 rounded-lg border border-white/[0.04] text-center">
                  <span className="block text-[6.5px] text-zinc-500 uppercase tracking-wider font-semibold">G+A Total</span>
                  <span className="block font-display text-sm font-black text-[#E8472A] mt-0.5">{player.gAndA}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Internal Links: Suggested Legends navigation list (great for Google crawlers) */}
          <div className="w-full max-w-[310px] mt-6 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4">
            <h3 className="text-xs font-black font-display text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" /> Compare Other Legends
            </h3>
            <div className="flex flex-col gap-1.5">
              {suggestedPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => onNavigateToPlayer(p.id)}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/45 hover:bg-[#E8472A]/10 border border-white/[0.03] hover:border-[#E8472A]/30 text-left transition-all duration-200 group"
                >
                  <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors truncate">{p.name}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-[#E8472A] transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Hand: Detailed Analysis, Graphs, and Related Debates list */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Ratio visualization box */}
          <div className="bg-zinc-900/35 border border-zinc-800/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8472A]/5 rounded-full blur-3xl pointer-events-none" />
            
            <h2 className="text-sm font-black font-display text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#E8472A]" /> Goal Contribution Balance
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Analyzing the dynamic share of goals vs playmaking assists setup inside {player.name}’s final goal contributions metric.
            </p>

            <div className="mt-5">
              <div className="flex justify-between text-xs font-bold text-zinc-300 mb-2">
                <span>Goals ({goalsRatio}%)</span>
                <span>Assists ({assistsRatio}%)</span>
              </div>
              {/* Contribution split line bar */}
              <div className="w-full h-3 rounded-full bg-zinc-950 overflow-hidden flex border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-[#FF5D42] rounded-l-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                  style={{ width: `${goalsRatio}%` }} 
                />
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-[#2A7AE8] rounded-r-full shadow-[0_0_10px_rgba(42,122,232,0.4)]" 
                  style={{ width: `${assistsRatio}%` }} 
                />
              </div>
              <div className="flex gap-4 mt-4 text-[10px] text-zinc-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500 block" />
                  <span>{player.goals} Goals Finishers</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 block" />
                  <span>{player.assists} Playmaker Assists</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related discussions list */}
          <div className="bg-zinc-900/35 border border-zinc-800/40 rounded-2xl p-6">
            <h2 className="text-sm font-black font-display text-white uppercase tracking-widest mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#E8472A]" /> Related Community Debates
            </h2>
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              Find live debates, predictions, and forums centered around {player.name}.
            </p>

            {relatedThreads.length === 0 ? (
              <div className="bg-zinc-950/40 p-6 rounded-xl border border-white/[0.03] text-center">
                <p className="text-zinc-500 text-xs">No specific debates are active for {player.name} yet.</p>
                <button
                  onClick={() => {
                    // Navigate to community section
                    window.history.pushState(null, '', '/community');
                    const popEvent = new PopStateEvent('popstate');
                    window.dispatchEvent(popEvent);
                  }}
                  className="mt-3 text-xs text-[#E8472A] hover:text-white transition-colors font-bold underline cursor-pointer"
                >
                  Create the first post to launch the debate!
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {relatedThreads.map(thread => (
                  <div
                    key={thread.threadId}
                    onClick={() => onNavigateToPost(thread.threadId)}
                    className="p-4 rounded-xl bg-zinc-950/45 hover:bg-zinc-900/45 border border-white/[0.03] hover:border-[#E8472A]/20 cursor-pointer transition-all duration-250 flex items-start justify-between gap-4 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase tracking-wider font-extrabold select-none">
                          {thread.category}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-semibold select-none">@{thread.username}</span>
                      </div>
                      <h3 className="text-xs md:text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                        {thread.title}
                      </h3>
                      {thread.description && (
                        <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1 leading-relaxed">
                          {thread.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 select-none">
                      <div className="text-[10px] text-zinc-500 font-extrabold flex items-center gap-1 mt-1 bg-zinc-900/60 px-2 py-1 rounded-lg border border-white/[0.02]">
                        <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{thread.commentsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Structured Link footer - SEO-Friendly anchor */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-2">
            <span>© GoalSpire Football index. All statistics updated for 2026.</span>
            <span className="flex items-center gap-1 hover:text-white transition-colors select-none">
              <LinkIcon className="w-3.5 h-3.5" />
              <a href="/" onClick={(e) => { e.preventDefault(); onBack(); }}>Home Arena Portal</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
