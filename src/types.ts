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
  id: string; // Document ID (usually matches commentId)
  commentId: string;
  postId: string;
  characterId: string; // maps to postId
  userId: string; // matches authorId
  authorId: string;
  username: string;
  text: string; // maps to content
  content: string;
  replyToUsername?: string; // used for simple flat replies
  timestamp: number; // matches createdAt
  createdAt: number;
  upvotes: number;
  likedBy?: string[];
  downvotes?: number;
  dislikedBy?: string[];
  reported?: boolean;
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
