/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Character {
  id: string;
  name: string;
  universe: string; // Map to Club
  category: string; // Map to Country
  goals: number;
  assists: number;
  gAndA: number;
  bodyCount: number; // Map to selected metric for matching
  countType: 'confirmed' | 'estimated' | 'Confirmed' | 'Estimated' | string;
  imageUrl: string;
}

export interface ReplyComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  upvotes: number;
  downvotes?: number;
  replies?: ReplyComment[];
}

export interface Thread {
  threadId: string;
  title: string;
  description: string;
  category: string;
  type: 'discussion' | 'poll' | 'prediction' | 'daily_debate';
  userId: string;
  username: string;
  userAvatar: string;
  upvotes: number;
  downvotes: number;
  timestamp: number;
  pollOptions?: string[];
  pollVotes?: number[];
  votedUserIds?: string[];
  commentsCount?: number;
  engagementScore?: number;
  threadCode?: string;
}

export interface Report {
  reportId: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'reply';
  reportedBy: string;
  reason: string;
  createdAt: number;
  contentPreview?: string;
  parentThreadId?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  upvotes: number;
  downvotes?: number;
  timestamp: number;
  replies: ReplyComment[];
}

export interface UserStats {
  bestStreak: number;
  gamesPlayed: number;
  correctGuesses: number;
  totalGuesses: number;
  favoriteUniverse: string;
}

export interface User {
  uid?: string;
  isGuest: boolean;
  guestId: string;
  username: string | null;
  avatar: string | null;
  joinedDate: string;
  isAdmin?: boolean;
}
