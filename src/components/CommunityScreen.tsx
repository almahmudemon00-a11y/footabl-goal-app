/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, Award, Shield, MessageSquare, Share2, Flag, Search, PlusCircle, Pin, Activity, Bell, 
  CheckCircle2, Users, AlertCircle, Clock, Send, Sparkles, SlidersHorizontal, HelpCircle, 
  Trash2, Edit, ChevronRight, X, Heart, ShieldAlert, BadgeInfo, Play, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, Check, ExternalLink
} from 'lucide-react';
import { Thread, Comment, User, Report } from '../types.ts';

import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  getDocs,
  where,
  limit,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';

// Reputation & ranking categories
const RANK_LIMITS = {
  Legend: 250,
  Expert: 100,
  Analyst: 50,
  Scout: 20
};

const DEFAULT_CATEGORIES = [
  '🔥 Unpopular Opinions',
  '🐐 GOAT Debate',
  '⭐ Best Striker',
  '🧠 Best Midfielder',
  '🛡️ Best Defender',
  '🧤 Best Goalkeeper',
  '👔 Managers',
  '📰 Transfers & Rumours',
  '🏟️ Club Debates',
  '🌍 International Football',
  '🔮 Predictions'
];

interface CommunityScreenProps {
  characters: any[];
  comments: Record<string, Comment[]>;
  user: User;
  onAddComment: any;
  onUpvoteComment: any;
  initialSelectedCharId?: string;
  onPathChange?: (path: string) => void;
  onNavigateToUser?: (username: string) => void;
}

export default function CommunityScreen({
  characters,
  user,
  initialSelectedCharId,
  onPathChange,
  onNavigateToUser
}: CommunityScreenProps) {
  const myUid = user.uid || user.guestId;
  const isGuest = user.isGuest;

  // Active navigation
  // 'feed' | 'admin' | 'my-posts' | 'event'
  const [activeSection, setActiveSection] = useState<'feed' | 'admin' | 'my-posts' | 'event'>('feed');
  
  // Admin panel subtabs
  const [adminTab, setAdminTab] = useState<'reports' | 'users' | 'categories'>('reports');

  // Categories list
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // Firestore Data stores
  const [posts, setPosts] = useState<Thread[]>([]);
  const [allComments, setAllComments] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Current logged in user profile from Firestore users collection (to check ban status, reputation penalties, and actual roles)
  const [userProfile, setUserProfile] = useState<any>(null);

  // Filters and searches
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'likes' | 'active'>('newest');

  // New Category Dropdown Systems
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState<boolean>(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [recentlyUsedCategories, setRecentlyUsedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = useState<number>(-1);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState<boolean>(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Filtered categories lists for internal drop search
  const filteredCategoriesList = useMemo(() => {
    const term = categorySearchQuery.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(c => c.toLowerCase().includes(term));
  }, [categories, categorySearchQuery]);

  const handleSelectCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
    setKeyboardSelectedIndex(-1);
    
    if (cat) {
      setRecentlyUsedCategories((prev) => {
        const filtered = prev.filter((item) => item !== cat);
        const updated = [cat, ...filtered].slice(0, 3);
        try {
          localStorage.setItem('recent_categories', JSON.stringify(updated));
        } catch {
          // No-op
        }
        return updated;
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation for keys
  useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      const totalItems = filteredCategoriesList.length + 1; // +1 to represent 'All Categories'
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setKeyboardSelectedIndex(prev => (prev + 1) % totalItems);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setKeyboardSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (keyboardSelectedIndex === 0) {
          handleSelectCategory(null);
        } else if (keyboardSelectedIndex > 0 && keyboardSelectedIndex <= filteredCategoriesList.length) {
          handleSelectCategory(filteredCategoriesList[keyboardSelectedIndex - 1]);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen, filteredCategoriesList, keyboardSelectedIndex]);

  // UI Modals / Intermediates
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>(DEFAULT_CATEGORIES[0]);

  // Edit states
  const [editingPost, setEditingPost] = useState<Thread | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');

  // Comment edit/reply states
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>('');
  const [newCommentText, setNewCommentText] = useState<string>('');

  // Report Modal states
  const [reportingItem, setReportingItem] = useState<{ id: string; type: 'post' | 'comment'; content: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>('Off-topic or irrelevant');

  // Delete Confirmation Popup states
  const [deletingItem, setDeletingItem] = useState<{ id: string; type: 'post' | 'comment'; parentPostId?: string } | null>(null);

  // Admin states
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Expanded post for Full Details Modal (replies tree)
  const [selectedPost, setSelectedPost] = useState<Thread | null>(null);

  // Quick notification banner helper
  const triggerNotification = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Real-time listener for current user profile
  useEffect(() => {
    if (!user.uid) {
      // Setup mock userProfile status if simple guest
      setUserProfile({
        userId: user.guestId,
        username: user.username || user.guestId,
        avatar: user.avatar,
        role: 'user',
        isBanned: false,
        reputationPoints: 0,
        penaltiesCount: 0,
        correctGuesses: 0
      });
      return;
    }

    const unUserProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        // Fallback default
        setUserProfile({
          userId: user.uid,
          username: user.username,
          avatar: user.avatar,
          role: 'user',
          isBanned: false,
          reputationPoints: 0,
          penaltiesCount: 0,
          correctGuesses: 0
        });
      }
    });

    return () => unUserProfile();
  }, [user.uid, user.guestId, user.username, user.avatar]);

  // Real-time listener for Categories
  useEffect(() => {
    const unsubCats = onSnapshot(collection(db, 'categories'), (snap) => {
      if (!snap.empty) {
        const list: string[] = [];
        snap.forEach(d => {
          list.push(d.data().name);
        });
        setCategories([...DEFAULT_CATEGORIES, ...list.filter(c => !DEFAULT_CATEGORIES.includes(c))]);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    });
    return () => unsubCats();
  }, []);

  // Real-time listener for posts ('threads')
  useEffect(() => {
    const qPosts = query(collection(db, 'threads'), orderBy('timestamp', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const list: Thread[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data() as Thread);
      });
      setPosts(list);
      setIsLoading(false);
    }, (err) => {
      console.error("Posts loading error:", err);
      setIsLoading(false);
    });

    return () => unsubPosts();
  }, []);

  // Real-time listener for comments ('comments')
  useEffect(() => {
    const qComments = query(collection(db, 'comments'), orderBy('timestamp', 'asc'));
    const unsubComments = onSnapshot(qComments, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAllComments(list);
    }, (err) => {
      console.error("Comments loading error:", err);
    });

    return () => unsubComments();
  }, []);

  // Real-time listener for users list (Admin view)
  useEffect(() => {
    const qUsers = query(collection(db, 'users'), limit(200));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push(docSnap.data());
      });
      setUsersList(list);
    }, (err) => {
      console.error("Users list loading error:", err);
    });
    return () => unsubUsers();
  }, []);

  // Real-time listener for active reports (Admin view)
  useEffect(() => {
    if (!user?.isAdmin) {
      setReportsList([]);
      return;
    }
    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const unsubReports = onSnapshot(qReports, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ reportId: docSnap.id, ...docSnap.data() });
      });
      setReportsList(list);
    }, (err) => {
      console.error("Reports loading error:", err);
    });
    return () => unsubReports();
  }, [user?.isAdmin]);

  // Sync details screen if a post gets modified/deleted while active
  useEffect(() => {
    if (selectedPost) {
      const updated = posts.find(p => p.threadId === selectedPost.threadId);
      if (updated) {
        setSelectedPost(updated);
      } else {
        setSelectedPost(null); // was deleted
      }
    }
  }, [posts, selectedPost]);

  // Handle redirect expand from PlayScreen target
  useEffect(() => {
    if (initialSelectedCharId && posts.length > 0) {
      const matchingPost = posts.find(
        p => p.threadId === initialSelectedCharId || p.threadCode === initialSelectedCharId
      );
      if (matchingPost) {
        setSelectedPost(matchingPost);
      }
    }
  }, [initialSelectedCharId, posts]);

  // Handle URL synchronizer and outer state change on post opening/closing
  useEffect(() => {
    if (selectedPost) {
      const targetPath = `/post/${selectedPost.threadId}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
        if (onPathChange) {
          onPathChange(targetPath);
        }
      }
    } else {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/post/')) {
        const fallbackPath = '/community';
        window.history.pushState(null, '', fallbackPath);
        if (onPathChange) {
          onPathChange(fallbackPath);
        }
      }
    }
  }, [selectedPost]);

  // Core authorization variables
  const isBanned = userProfile?.isBanned === true;
  const isUserAdmin = userProfile?.role === 'admin' || userProfile?.isAdmin === true || user.isAdmin === true;
  const isUserModerator = isUserAdmin || userProfile?.role === 'moderator';

  // Helper: Reputation and Rank Calculation dynamically
  const reputationMap = useMemo(() => {
    const map: Record<string, { points: number; rank: string; color: string; bg: string }> = {};

    // 1. Initialize for users list
    usersList.forEach(u => {
      const uid = u.userId || u.uid;
      if (!uid) return;

      // Filter all posts by this user
      const userPosts = posts.filter(p => p.userId === uid);
      const likesCount = userPosts.reduce((acc, p) => acc + (p.likedBy?.length || p.upvotes || 0), 0);
      const dislikesCount = userPosts.reduce((acc, p) => acc + (p.dislikedBy?.length || p.downvotes || 0), 0);
      const guesses = u.correctGuesses || 0;
      const commentsPosted = allComments.filter(c => c.userId === uid).length;
      const penalties = u.penaltiesCount || 0;

      // Score Formula
      const score = Math.max(0, (likesCount * 5) + (guesses * 10) + (commentsPosted * 5) - (dislikesCount * 2) - (penalties * 20));

      let rank = 'Rookie';
      let color = 'text-zinc-400 border-zinc-500/20';
      let bg = 'bg-zinc-500/10 hover:bg-zinc-500/20';

      if (score >= RANK_LIMITS.Legend) {
        rank = '👑 Legend';
        color = 'text-amber-400 border-amber-500/30';
        bg = 'bg-amber-500/15 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
      } else if (score >= RANK_LIMITS.Expert) {
        rank = '🔥 Expert';
        color = 'text-rose-400 border-rose-500/30';
        bg = 'bg-rose-500/15';
      } else if (score >= RANK_LIMITS.Analyst) {
        rank = '🧠 Analyst';
        color = 'text-purple-400 border-purple-500/30';
        bg = 'bg-purple-500/15';
      } else if (score >= RANK_LIMITS.Scout) {
        rank = '🏹 Scout';
        color = 'text-sky-400 border-sky-500/30';
        bg = 'bg-sky-500/15';
      }

      map[uid] = { points: score, rank, color, bg };
    });

    return map;
  }, [posts, allComments, usersList]);

  // Safe getter for any user's reputation and rank
  const getUserMeta = (userId: string, defaultName = "Anonymous") => {
    const meta = reputationMap[userId];
    if (meta) {
      return meta;
    }
    // Default fallback
    return {
      points: 0,
      rank: 'Rookie',
      color: 'text-zinc-500 border-zinc-800',
      bg: 'bg-zinc-900/50'
    };
  };

  // Computed / Filtered lists
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Filter by Category
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }

    // Section view toggle
    if (activeSection === 'my-posts') {
      result = result.filter(p => p.userId === myUid);
    }

    // Sort options
    if (sortOption === 'likes') {
      result.sort((a, b) => {
        const likesA = a.likedBy?.length || a.upvotes || 0;
        const likesB = b.likedBy?.length || b.upvotes || 0;
        return likesB - likesA;
      });
    } else if (sortOption === 'active') {
      result.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    } else {
      // newest
      result.sort((a, b) => b.timestamp - a.timestamp);
    }

    return result;
  }, [posts, selectedCategory, searchQuery, activeSection, sortOption, myUid]);

  // Create a Post Handler
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      triggerNotification("Guests cannot create posts! Please sign in.", true);
      return;
    }
    if (isBanned) {
      triggerNotification("Your account is currently banned from posting.", true);
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      triggerNotification("Please fill in all post details.", true);
      return;
    }

    const postId = 'post_' + Date.now();
    const newPostDoc: Thread = {
      threadId: postId,
      title: newTitle.trim(),
      description: newContent.trim(),
      category: newCategory,
      type: 'discussion',
      userId: myUid,
      username: user.username || 'User_' + myUid.slice(0, 4),
      userAvatar: user.avatar || 'FC',
      upvotes: 0,
      downvotes: 0,
      timestamp: Date.now(),
      votedUserIds: [],
      commentsCount: 0
    };

    // Add extra tracking list attributes that are validated by security rules
    const extraAttrs = {
      likedBy: [],
      dislikedBy: [],
      reported: false,
      reports: []
    };

    try {
      await setDoc(doc(db, 'threads', postId), {
        ...newPostDoc,
        ...extraAttrs,
        timestamp: Date.now() // client-side numeric timestamp fallback
      });
      setNewTitle('');
      setNewContent('');
      setIsCreateModalOpen(false);
      triggerNotification("Post created successfully!");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to create post. Check permissions.", true);
    }
  };

  // Edit User Post
  const handleEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    if (isBanned) {
      triggerNotification("Your account is currently banned.", true);
      return;
    }
    if (!editTitle.trim() || !editContent.trim()) {
      triggerNotification("Title and content cannot be empty.", true);
      return;
    }

    try {
      const updateData = {
        title: editTitle.trim(),
        description: editContent.trim(),
        category: editCategory
      };
      await updateDoc(doc(db, 'threads', editingPost.threadId), updateData);
      setEditingPost(null);
      triggerNotification("Post updated successfully!");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to edit post.", true);
    }
  };

  // Post Like Toggle
  const handleToggleLike = async (postId: string) => {
    if (isGuest) {
      triggerNotification("Guest accounts cannot vote.", true);
      return;
    }
    if (isBanned) {
      triggerNotification("Banned users cannot vote.", true);
      return;
    }

    const postDoc = posts.find(p => p.threadId === postId);
    if (!postDoc) return;

    let likedBy = (postDoc as any).likedBy || [];
    let dislikedBy = (postDoc as any).dislikedBy || [];

    const isLiked = likedBy.includes(myUid);
    const isDisliked = dislikedBy.includes(myUid);

    if (isLiked) {
      // Remove like
      likedBy = likedBy.filter((uid: string) => uid !== myUid);
    } else {
      // Add like, remove dislike
      likedBy.push(myUid);
      dislikedBy = dislikedBy.filter((uid: string) => uid !== myUid);
    }

    try {
      await updateDoc(doc(db, 'threads', postId), {
        likedBy,
        dislikedBy,
        upvotes: likedBy.length,
        downvotes: dislikedBy.length
      });
    } catch (err) {
      console.error("Like toggle error:", err);
      triggerNotification("Operation failed.", true);
    }
  };

  // Post Dislike Toggle
  const handleToggleDislike = async (postId: string) => {
    if (isGuest) {
      triggerNotification("Guest accounts cannot vote.", true);
      return;
    }
    if (isBanned) {
      triggerNotification("Banned users cannot vote.", true);
      return;
    }

    const postDoc = posts.find(p => p.threadId === postId);
    if (!postDoc) return;

    let likedBy = (postDoc as any).likedBy || [];
    let dislikedBy = (postDoc as any).dislikedBy || [];

    const isLiked = likedBy.includes(myUid);
    const isDisliked = dislikedBy.includes(myUid);

    if (isDisliked) {
      // Remove dislike
      dislikedBy = dislikedBy.filter((uid: string) => uid !== myUid);
    } else {
      // Add dislike, remove like
      dislikedBy.push(myUid);
      likedBy = likedBy.filter((uid: string) => uid !== myUid);
    }

    try {
      await updateDoc(doc(db, 'threads', postId), {
        likedBy,
        dislikedBy,
        upvotes: likedBy.length,
        downvotes: dislikedBy.length
      });
    } catch (err) {
      console.error("Dislike toggle error:", err);
      triggerNotification("Operation failed.", true);
    }
  };

  // Open Edit Modal Helper
  const openEditPostModal = (post: Thread) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.description);
    setEditCategory(post.category);
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingItem) return;

    const reportId = 'rep_' + Date.now();
    const reportData = {
      reportId,
      targetId: reportingItem.id,
      targetType: reportingItem.type,
      reportedBy: user.username || myUid,
      reason: reportReason,
      createdAt: Date.now(),
      contentPreview: reportingItem.content.slice(0, 150)
    };

    try {
      // 1. Create Report document
      await setDoc(doc(db, 'reports', reportId), reportData);

      // 2. Mark parent doc as reported
      if (reportingItem.type === 'post') {
        const postRef = doc(db, 'threads', reportingItem.id);
        await updateDoc(postRef, {
          reported: true
        });
      } else {
        const commentRef = doc(db, 'comments', reportingItem.id);
        await updateDoc(commentRef, {
          reported: true
        });
      }

      setReportingItem(null);
      setReportReason('Off-topic or irrelevant');
      triggerNotification("Content has been reported for moderation.");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to submit report.", true);
    }
  };

  // Safe Cascade Delete for Post/Comments (User & Admin with confirmation popups)
  const executeDeletePost = async (postId: string) => {
    try {
      // 1. Delete all comments relating to this post
      const parentComments = allComments.filter(c => c.characterId === postId);
      for (const com of parentComments) {
        await deleteDoc(doc(db, 'comments', com.id));
      }

      // 2. Clear any associated reports
      const assocReports = reportsList.filter(r => r.targetId === postId);
      for (const rep of assocReports) {
        await deleteDoc(doc(db, 'reports', rep.reportId));
      }

      // 3. Delete original post document
      await deleteDoc(doc(db, 'threads', postId));

      setDeletingItem(null);
      if (selectedPost?.threadId === postId) {
        setSelectedPost(null);
      }
      triggerNotification("Post and associated comments successfully deleted!");
    } catch (err) {
      console.error(err);
      triggerNotification("Error executing deletion check.", true);
    }
  };

  // Comments Logic
  const handleAddRootComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (isBanned) {
      triggerNotification("Your account is currently banned.", true);
      return;
    }
    if (!newCommentText.trim()) return;

    const commentId = 'com_' + Date.now();
    const trimmedText = newCommentText.trim();
    
    // Check if the comment text begins with @username and parse out replyToUsername
    let replyToUsername: string | undefined = undefined;
    const match = trimmedText.match(/^@([a-zA-Z0-9_\-]+)/);
    if (match) {
      replyToUsername = match[1];
    }

    const commentRecord = {
      commentId,
      characterId: postId,
      userId: myUid,
      username: user.username || 'User_' + myUid.slice(0, 4),
      text: trimmedText,
      replyToUsername: replyToUsername || null,
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0,
      likedBy: [],
      dislikedBy: [],
      reported: false
    };

    try {
      await setDoc(doc(db, 'comments', commentId), commentRecord);
      
      // Update comment count on post
      const postRef = doc(db, 'threads', postId);
      const matchedPost = posts.find(p => p.threadId === postId);
      if (matchedPost) {
        await updateDoc(postRef, {
          commentsCount: (matchedPost.commentsCount || 0) + 1
        });
      }

      setNewCommentText('');
      triggerNotification("Comment posted!");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to post comment.", true);
    }
  };

  // Like a comment
  const handleLikeComment = async (commentId: string) => {
    if (isBanned) {
      triggerNotification("Your account is currently banned.", true);
      return;
    }

    const commentDoc = allComments.find(c => c.id === commentId);
    if (!commentDoc) return;

    let likedBy = commentDoc.likedBy || [];
    let upvotesCount = commentDoc.upvotes || 0;
    let dislikedBy = commentDoc.dislikedBy || [];
    let downvotesCount = commentDoc.downvotes || 0;

    const isLiked = likedBy.includes(myUid);
    if (isLiked) {
      likedBy = likedBy.filter((uid: string) => uid !== myUid);
      upvotesCount = Math.max(0, upvotesCount - 1);
    } else {
      likedBy.push(myUid);
      upvotesCount += 1;
      // Remove dislike if registered
      if (dislikedBy.includes(myUid)) {
        dislikedBy = dislikedBy.filter((uid: string) => uid !== myUid);
        downvotesCount = Math.max(0, downvotesCount - 1);
      }
    }

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        likedBy,
        upvotes: upvotesCount,
        dislikedBy,
        downvotes: downvotesCount
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Dislike a comment
  const handleDislikeComment = async (commentId: string) => {
    if (isBanned) {
      triggerNotification("Your account is currently banned.", true);
      return;
    }

    const commentDoc = allComments.find(c => c.id === commentId);
    if (!commentDoc) return;

    let likedBy = commentDoc.likedBy || [];
    let upvotesCount = commentDoc.upvotes || 0;
    let dislikedBy = commentDoc.dislikedBy || [];
    let downvotesCount = commentDoc.downvotes || 0;

    const isDisliked = dislikedBy.includes(myUid);
    if (isDisliked) {
      dislikedBy = dislikedBy.filter((uid: string) => uid !== myUid);
      downvotesCount = Math.max(0, downvotesCount - 1);
    } else {
      dislikedBy.push(myUid);
      downvotesCount += 1;
      // Remove like if registered
      if (likedBy.includes(myUid)) {
        likedBy = likedBy.filter((uid: string) => uid !== myUid);
        upvotesCount = Math.max(0, upvotesCount - 1);
      }
    }

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        likedBy,
        upvotes: upvotesCount,
        dislikedBy,
        downvotes: downvotesCount
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Comment Text (inline)
  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    if (isBanned) {
      triggerNotification("Banned users cannot edit content.", true);
      return;
    }

    try {
      await updateDoc(doc(db, 'comments', commentId), {
        text: editingCommentText.trim(),
        content: editingCommentText.trim()
      });
      setEditingCommentId(null);
      setEditingCommentText('');
      triggerNotification("Comment updated!");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to edit comment.", true);
    }
  };

  // Delete Comment (Cascade removes or simple flags)
  const executeDeleteComment = async (commentId: string, parentPostId: string | undefined) => {
    try {
      // Delete the original comment
      await deleteDoc(doc(db, 'comments', commentId));

      // Subtract count from thread
      if (parentPostId) {
        const postRef = doc(db, 'threads', parentPostId);
        const matchedPost = posts.find(p => p.threadId === parentPostId);
        if (matchedPost) {
          await updateDoc(postRef, {
            commentsCount: Math.max(0, (matchedPost.commentsCount || 0) - 1)
          });
        }
      }

      // Clear matching reports
      const asReports = reportsList.filter(r => r.targetId === commentId);
      for (const r of asReports) {
        await deleteDoc(doc(db, 'reports', r.reportId));
      }

      setDeletingItem(null);
      triggerNotification("Comment deleted!");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to delete comment.", true);
    }
  };

  const handleReplyClick = (targetUsername: string) => {
    if (commentInputRef.current) {
      commentInputRef.current.focus();
      const currentVal = newCommentText.trim();
      const prefix = `@${targetUsername} `;
      if (!currentVal.startsWith(`@${targetUsername}`)) {
        setNewCommentText(prefix + (currentVal ? " " + currentVal : ""));
      }
    } else {
      const currentVal = newCommentText.trim();
      setNewCommentText(`@${targetUsername} ` + currentVal);
    }
  };

  // Administration Controls Actions
  const handleAddNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    // Simple verification with custom prefix emoji mapping
    let formatted = newCategoryName.trim();
    if (!formatted.includes(' ')) {
      formatted = '🏟️ ' + formatted;
    }

    try {
      const catId = 'cat_' + Date.now();
      await setDoc(doc(db, 'categories', catId), {
        name: formatted,
        createdAt: Date.now()
      });
      setNewCategoryName('');
      triggerNotification(`New category "${formatted}" added successfully!`);
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to add category.", true);
    }
  };

  const handleDeleteCategory = async (catName: string) => {
    if (DEFAULT_CATEGORIES.includes(catName)) {
      triggerNotification("Cannot delete built-in system categories.", true);
      return;
    }

    try {
      const q = query(collection(db, 'categories'), where('name', '==', catName));
      const s = await getDocs(q);
      s.forEach(async (d) => {
        await deleteDoc(doc(db, 'categories', d.id));
      });
      triggerNotification(`Category "${catName}" removed.`);
    } catch (err) {
      console.error(err);
    }
  };

  // Dismiss report in Queue list
  const handleDismissReport = async (reportId: string, parentTargetId: string, targetType: string) => {
    try {
      // 1. Delete report document
      await deleteDoc(doc(db, 'reports', reportId));

      // 2. Clear reported flag on original document
      if (targetType === 'post') {
        const docRef = doc(db, 'threads', parentTargetId);
        await updateDoc(docRef, { reported: false });
      } else {
        const docRef = doc(db, 'comments', parentTargetId);
        await updateDoc(docRef, { reported: false });
      }

      triggerNotification("Report dismissed successfully.");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to dismiss report.", true);
    }
  };

  // Moderator/Admin direct action: delete reported content
  const handleAdminDeleteReportedContent = async (reportId: string, targetId: string, targetType: string) => {
    try {
      if (targetType === 'post') {
        await executeDeletePost(targetId);
      } else {
        await executeDeleteComment(targetId, undefined);
      }
      
      // Clean up the report itself
      await deleteDoc(doc(db, 'reports', reportId));
      triggerNotification("Reported content removed successfully.");
    } catch (err) {
      console.error(err);
      triggerNotification("Admin delete failed.", true);
    }
  };

  // Ban or Unban users (Admin privilege)
  const handleToggleUserBan = async (userId: string, isCurrentlyBanned: boolean) => {
    if (userId === myUid) {
      triggerNotification("You cannot ban yourself!", true);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        isBanned: !isCurrentlyBanned,
        updatedAt: serverTimestamp()
      });
      triggerNotification(`User is now ${!isCurrentlyBanned ? 'BANNED' : 'UNBANNED'}`);
    } catch (err) {
      console.error(err);
      triggerNotification("Ban modification failed.", true);
    }
  };

  // Change user roles (Promote/Demote)
  const handleModifyUserRole = async (userId: string, targetRole: 'admin' | 'moderator' | 'user') => {
    if (userId === myUid) {
      triggerNotification("You cannot change your own role!", true);
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: targetRole,
        isAdmin: targetRole === 'admin',
        updatedAt: serverTimestamp()
      });
      triggerNotification(`User role successfully set to: ${targetRole.toUpperCase()}`);
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to promote / demote user.", true);
    }
  };

  // Issue reputation penalty
  const handleIssuePenalty = async (userId: string) => {
    const usr = usersList.find(u => u.userId === userId || u.uid === userId);
    const existingPenalties = usr?.penaltiesCount || 0;

    try {
      await updateDoc(doc(db, 'users', userId), {
        penaltiesCount: existingPenalties + 1,
        updatedAt: serverTimestamp()
      });
      triggerNotification("Reputation penalty issued successfully (-20 points deducted).");
    } catch (err) {
      console.error(err);
      triggerNotification("Failed to issue penalty.", true);
    }
  };

  // Admin user query filter
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return usersList;
    const q = userSearchQuery.toLowerCase().trim();
    return usersList.filter(u => u.username?.toLowerCase().includes(q) || (u.userId || u.uid)?.toLowerCase().includes(q));
  }, [usersList, userSearchQuery]);

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto flex flex-col font-sans text-zinc-100 antialiased">
      
      {/* Dynamic Floating Toast Message Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl border flex items-center gap-3 shadow-[0_12px_24px_rgba(0,0,0,0.4)] backdrop-blur ${
              statusMessage.isError 
                ? 'border-rose-500/40 bg-[#120509]/95 text-rose-300' 
                : 'border-amber-500/40 bg-[#0e0a05]/95 text-[#ffae58]'
            }`}
          >
            {statusMessage.isError ? <X className="w-4 h-4 text-rose-400 shrink-0" /> : <Sparkles className="w-4 h-4 text-[#ffae58] shrink-0" />}
            <span className="text-xs font-semibold tracking-wide">{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE TOP ROW: HEADER AND USER CARD */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-zinc-800/40">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-[#ffd9a3] to-amber-200 bg-clip-text text-transparent flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-500 animate-pulse" />
            Arena Community
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Rebuilt from scratch. Engage, debate, and verify football reputation with proper moderation.
          </p>
        </div>

        {/* LOGGED IN USER STATE CARD */}
        {userProfile && (
          <div className="p-4 rounded-2xl border border-zinc-850 bg-zinc-950/60 backdrop-blur w-full md:w-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center font-extrabold text-[#ffcd91] text-sm">
                {userProfile.avatar || userProfile.username?.slice(0, 2).toUpperCase() || 'FC'}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-sm tracking-tight text-zinc-100">{userProfile.username || 'GuestPlayer'}</span>
                  {isUserAdmin && (
                    <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8.5px] px-1.5 py-0.5 rounded uppercase font-extrabold flex items-center gap-0.5">
                      <Shield className="w-2 h-2" /> Admin
                    </span>
                  )}
                  {!isUserAdmin && isUserModerator && (
                    <span className="bg-[#a8a1ff]/15 border border-[#a8a1ff]/30 text-[#bbc1ff] text-[8.5px] px-1.5 py-0.5 rounded uppercase font-bold flex items-center gap-0.5">
                      <Shield className="w-2 h-2" /> Mod
                    </span>
                  )}
                </div>

                {/* Score & Rank representation */}
                <div className="flex items-center gap-2 mt-1">
                  <div className={`text-[9.5px] px-2 py-0.5 rounded-full border tracking-wider font-semibold ${getUserMeta(myUid).color} ${getUserMeta(myUid).bg}`}>
                    {getUserMeta(myUid).points} Rep • {getUserMeta(myUid).rank}
                  </div>
                </div>
              </div>
            </div>

            {/* If user is Banned, indicate */}
            {isBanned && (
              <div className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> Banned
              </div>
            )}
          </div>
        )}
      </div>

      {/* BAN WARNING WRAPPER */}
      {isBanned && (
        <div className="mb-6 p-4 rounded-2xl border border-rose-500/30 bg-rose-950/15 flex items-center gap-3.5 text-rose-300">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
          <div className="text-left">
            <h4 className="font-bold text-xs text-rose-400">Your account is currently banned</h4>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              An administrator has restricted your platform write actions. You can read, but you cannot create posts, comment, reply, or vote.
            </p>
          </div>
        </div>
      )}

      {/* CORE NAVIGATION BAR */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-6 border-b border-zinc-800/20 pb-4">
        {/* VIEW SELECTORS */}
        <div className="flex items-center gap-1.5 bg-zinc-950/60 p-1 border border-zinc-900 rounded-xl">
          <button
            onClick={() => setActiveSection('feed')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSection === 'feed'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Active Feed
          </button>

          {!isGuest && (
            <button
              onClick={() => setActiveSection('my-posts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeSection === 'my-posts'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              My Posts
            </button>
          )}

          <button
            onClick={() => setActiveSection('event')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 relative overflow-hidden ${
              activeSection === 'event'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-350 shadow-md !text-zinc-950'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-[#E8472A] fill-[#E8472A]/10" />
            <span>Event</span>
            <span className="text-[7px] font-mono bg-[#E8472A]/15 text-amber-500 px-1 py-0.5 rounded border border-[#E8472A]/20">SOON</span>
          </button>

          {isUserModerator && (
            <button
              onClick={() => setActiveSection('admin')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-500/20 ${
                activeSection === 'admin'
                  ? 'bg-amber-950/20 text-amber-400 border-amber-500/50 font-extrabold shadow-sm'
                  : 'text-amber-500 hover:text-amber-400 hover:bg-zinc-900/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin Panel
            </button>
          )}
        </div>

        {/* CREATE POST TRIGGERS */}
        {activeSection !== 'admin' && !isBanned && (
          <button
            onClick={() => {
              if (isGuest) {
                triggerNotification("Signed-in athletes only may post thread.", true);
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-tr from-[#ffa83e] to-[#ffcd91] text-zinc-950 rounded-xl font-extrabold text-xs tracking-tight shadow-lg hover:shadow-orange-500/10 flex items-center gap-1.5 hover:scale-[1.01] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> New Post
          </button>
        )}
      </div>

      {/* CONTENT VIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* FEED FILTERS LEFT COLUMN */}
        {activeSection !== 'admin' && activeSection !== 'event' && (
          <>
            {/* Mobile Filter Toggle Header Button */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="lg:hidden w-full flex items-center justify-between p-4 bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-805/80 rounded-2xl text-xs font-bold uppercase text-zinc-100 shadow-lg mb-1 cursor-pointer select-none"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                <span>Refine Arena Feed</span>
                {(selectedCategory || searchQuery.trim()) && (
                  <span className="w-2 h-2 rounded-full bg-amber-505 animate-pulse" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-400 lowercase font-medium">
                  {selectedCategory ? `${selectedCategory.split(' ').slice(1).join(' ') || selectedCategory}` : 'all categories'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isMobileFiltersOpen ? 'rotate-180 text-amber-500' : 'text-zinc-400'}`} />
              </div>
            </button>

            <div className={`${isMobileFiltersOpen ? 'flex' : 'hidden'} lg:flex lg:col-span-1 flex-col gap-4 w-full`}>
              
              {/* Search Input Card */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-900/60 rounded-2xl shadow-xl w-full">
                <h4 className="text-xs font-extrabold text-amber-400 mb-3 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <Search className="w-3.5 h-3.5 text-amber-500" /> Filter Debates
                </h4>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-zinc-100 placeholder-zinc-550 text-xs bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-amber-550 focus:ring-1 focus:ring-amber-500/10 transition-all text-left"
                  />
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                </div>

                {/* Reset filter trigger */}
                {(selectedCategory || searchQuery.trim()) && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearchQuery('');
                      setIsMobileFiltersOpen(false);
                    }}
                    className="w-full mt-3 px-2 py-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase transition-all tracking-wider"
                  >
                    Clear Feed Filters
                  </button>
                )}
              </div>

              {/* Sorter Selector */}
              <div className="p-4 bg-zinc-950/80 border border-zinc-900/60 rounded-2xl shadow-xl w-full flex flex-col gap-2">
                <h4 className="text-xs font-extrabold text-amber-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" /> Sort Order
                </h4>
                <div className="flex flex-col gap-1.5 text-left">
                  <button
                    onClick={() => setSortOption('newest')}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      sortOption === 'newest' 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' 
                        : 'text-zinc-400 hover:bg-zinc-900/40 border border-transparent'
                    }`}
                  >
                    <span>Newest Debates</span>
                    <Clock className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setSortOption('likes')}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      sortOption === 'likes' 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' 
                        : 'text-zinc-400 hover:bg-zinc-900/40 border border-transparent'
                    }`}
                  >
                    <span>Most Liked</span>
                    <Heart className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setSortOption('active')}
                    className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                      sortOption === 'active' 
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' 
                        : 'text-zinc-400 hover:bg-zinc-900/40 border border-transparent'
                    }`}
                  >
                    <span>Most Active</span>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            {/* Dynamic & Managed list of Categories menu */}
            <div ref={categoryDropdownRef} className="relative w-full">
              <div className="bg-zinc-950/50 border border-zinc-900 hover:border-zinc-800/80 rounded-2xl p-3 flex flex-col gap-2 transition-all">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-extrabold text-amber-500/80 uppercase tracking-widest flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3 h-3 text-amber-500/85" /> Arena Rooms
                  </h4>
                  {selectedCategory && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectCategory(null);
                      }}
                      className="text-[9px] font-bold text-zinc-500 hover:text-amber-400 transition uppercase tracking-wider cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                <button
                  id="category-dropdown-trigger"
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className={`w-full h-10 px-3.5 bg-zinc-900/90 hover:bg-zinc-900 text-zinc-100 border rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-between cursor-pointer outline-none select-none ${
                    isCategoryDropdownOpen 
                      ? 'border-amber-500/50 shadow-md ring-1 ring-amber-500/20' 
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    {selectedCategory ? (
                      <span className="text-amber-300 font-extrabold">{selectedCategory}</span>
                    ) : (
                      <span className="text-[#ffa83e] font-extrabold">🌐 All Categories</span>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <span className="text-[10px] opacity-50 bg-zinc-800/60 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                      {selectedCategory ? posts.filter(p => p.category === selectedCategory).length : posts.length}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-250 ${isCategoryDropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
                  </div>
                </button>
              </div>

              {/* Dropdown Popover List */}
              <AnimatePresence>
                {isCategoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.99 }}
                    transition={{ duration: 0.25 }}
                    className="absolute z-50 left-0 right-0 mt-1 max-h-96 bg-zinc-950/98 border border-zinc-800/90 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1.5 backdrop-blur-xl"
                  >
                    {/* Search Field */}
                    <div className="relative p-1">
                      <input
                        type="text"
                        placeholder="Search rooms..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        className="w-full text-zinc-100 placeholder-zinc-500 text-xs bg-zinc-900 border border-zinc-850 rounded-xl py-2 px-3 pl-8 focus:outline-none focus:border-amber-500/40 transition-all text-left"
                        autoFocus
                      />
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3.5" />
                      {categorySearchQuery && (
                        <button
                          type="button"
                          onClick={() => setCategorySearchQuery('')}
                          className="absolute right-3 top-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Recently Used Section */}
                    {recentlyUsedCategories.length > 0 && !categorySearchQuery && (
                      <div className="px-2 py-1.5 border-b border-zinc-900/60 mb-0.5">
                        <span className="text-[9px] font-extrabold text-[#ffa83e]/60 uppercase tracking-widest flex items-center gap-1 mb-1.5">
                          <Clock className="w-2.5 h-2.5 text-amber-500/65" /> Recent Rooms
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {recentlyUsedCategories.map((recentCat) => {
                            const count = posts.filter(p => p.category === recentCat).length;
                            return (
                              <button
                                type="button"
                                key={recentCat}
                                onClick={() => handleSelectCategory(recentCat)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  selectedCategory === recentCat
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/25'
                                    : 'bg-zinc-900/90 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-transparent'
                                }`}
                              >
                                <span>{recentCat}</span>
                                <span className="text-[8px] opacity-50 font-mono">({count})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                      {/* All Categories Option */}
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(null)}
                        className={`text-left w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          selectedCategory === null
                            ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 text-amber-300 font-extrabold border-l-2 border-amber-500'
                            : keyboardSelectedIndex === 0
                            ? 'bg-zinc-900 text-zinc-100 border-l-2 border-zinc-700'
                            : 'text-zinc-400 hover:bg-zinc-900/40 border-l-2 border-transparent'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🌐 All Categories</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono opacity-50 bg-zinc-900 px-1 rounded text-zinc-400">({posts.length})</span>
                          {selectedCategory === null && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                      </button>

                      {/* Filtered Categories */}
                      {filteredCategoriesList.length === 0 ? (
                        <div className="px-3 py-6 text-center text-zinc-500 text-xs">
                          No category matches your search.
                        </div>
                      ) : (
                        filteredCategoriesList.map((cat, idx) => {
                          const finalIdx = idx + 1; // offset because 'All Categories' is first
                          const num = posts.filter(p => p.category === cat).length;
                          const isSelected = selectedCategory === cat;
                          const isFocused = keyboardSelectedIndex === finalIdx;

                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleSelectCategory(cat)}
                              className={`text-left w-full px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 text-amber-300 font-extrabold border-l-2 border-amber-500'
                                  : isFocused
                                  ? 'bg-zinc-900 text-zinc-100 border-l-2 border-zinc-700'
                                  : 'text-zinc-400 hover:bg-zinc-900/40 border-l-2 border-transparent'
                              }`}
                            >
                              <span className="truncate flex items-center gap-2">
                                <span className="truncate">{cat}</span>
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                <span className="text-[10px] font-mono opacity-50 bg-zinc-900 px-1 rounded text-zinc-400">({num})</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      )}

        {/* FEED CONTENT COLUMN or ADMIN CONTROL TABS PANEL */}
        <div className={activeSection === 'admin' || activeSection === 'event' ? 'lg:col-span-4' : 'lg:col-span-3'}>

          {isLoading ? (
            /* Sleek Loading Skeleton cards */
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/20 animate-pulse flex flex-col gap-3">
                  <div className="flex h-4 bg-zinc-900 w-1/3 rounded-lg" />
                  <div className="flex h-7 bg-zinc-900 w-3/4 rounded-lg" />
                  <div className="flex h-16 bg-zinc-900 rounded-lg" />
                  <div className="flex h-4 bg-zinc-900 w-1/4 rounded-lg mt-2" />
                </div>
              ))}
            </div>
          ) : activeSection === 'admin' ? (
            
            /* ========================================================
               ADMIN PANEL DASHBOARD
               ======================================================== */
            <div className="flex flex-col gap-6">
              
              {/* ADMIN INNER HEADER SYSTEM */}
              <div className="p-6 rounded-2xl border border-rose-500/15 bg-rose-950/5 text-left flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-7 h-7 text-[#ffae58]" />
                  <div>
                    <h2 className="text-xl font-black text-rose-400 uppercase tracking-tight">System Moderator Controls</h2>
                    <p className="text-[11px] text-zinc-400">Manage Arena, dispatch warnings, dismiss flags, ban toxic players, and update Rooms collections.</p>
                  </div>
                </div>

                {/* Sub tabs configuration */}
                <div className="flex gap-2 border-t border-zinc-800/60 pt-4 mt-1 flex-wrap">
                  <button
                    onClick={() => setAdminTab('reports')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                      adminTab === 'reports'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-inner'
                        : 'bg-zinc-950/60 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    🚩 Reports Queue ({reportsList.length})
                  </button>

                  <button
                    onClick={() => setAdminTab('users')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                      adminTab === 'users'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-inner'
                        : 'bg-zinc-950/60 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    👥 User Directory ({usersList.length})
                  </button>

                  <button
                    onClick={() => setAdminTab('categories')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                      adminTab === 'categories'
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-inner'
                        : 'bg-zinc-950/60 border-zinc-900 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    📂 Room Category Master ({categories.length})
                  </button>
                </div>
              </div>

              {/* TAB 1: REPORTS QUEUE VIEWER */}
              {adminTab === 'reports' && (
                <div className="flex flex-col gap-4 text-left">
                  {reportsList.length === 0 ? (
                    <div className="p-10 rounded-2xl border border-zinc-900 bg-zinc-950/20 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-bounce" />
                      <p className="text-zinc-400 text-sm font-bold">Report Queue is Clear!</p>
                      <p className="text-zinc-600 text-xs mt-1">No reported post or comment actions require moderation.</p>
                    </div>
                  ) : (
                    reportsList.map((r) => {
                      const ageText = new Date(r.createdAt || Date.now()).toLocaleString();
                      return (
                        <div key={r.reportId} className="p-5 bg-zinc-950/80 border border-zinc-900 rounded-2xl flex flex-col gap-3">
                          <div className="flex justify-between items-center flex-wrap gap-2 text-[10px] font-mono border-b border-zinc-900 pb-2.5">
                            <span className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2.5 py-0.5 rounded font-bold uppercase flex items-center gap-1.5">
                              <Flag className="w-3 h-3" /> Flagged {r.targetType.toUpperCase()}
                            </span>
                            <span className="text-zinc-500">Report ID: {r.reportId}</span>
                            <span className="text-zinc-500 ml-auto">{ageText}</span>
                          </div>

                          <div className="text-xs text-zinc-300 flex flex-col gap-1.5">
                            <div>
                              <span className="text-zinc-500 font-semibold font-mono">Report Reason: </span>
                              <span className="text-rose-400 font-bold bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">"{r.reason}"</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 font-semibold font-mono">Submitted By: </span>
                              <span className="text-zinc-400">{r.reportedBy}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 font-semibold font-mono">Content Preview: </span>
                              <p className="mt-1.5 p-3 rounded-lg bg-zinc-900 text-zinc-200 indent-2 italic font-sans border border-zinc-850">
                                {r.contentPreview || "[No Content Attached]"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-900/60 pt-3 flex-wrap">
                            <button
                              onClick={() => handleDismissReport(r.reportId, r.targetId, r.targetType)}
                              className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold hover:bg-zinc-800 transition"
                            >
                              Dismiss Flag
                            </button>

                            <button
                              onClick={() => handleAdminDeleteReportedContent(r.reportId, r.targetId, r.targetType)}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-extrabold transition-all"
                            >
                              Delete Bad Content
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: USER DIRECTORY CONTROL */}
              {adminTab === 'users' && (
                <div className="flex flex-col gap-4 text-left">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search User Profiles by Name..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full text-zinc-100 text-xs bg-zinc-950 border border-zinc-900 rounded-xl p-3 pl-10 focus:outline-none focus:border-rose-500 text-left"
                    />
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUsers.map((u) => {
                      const uid = u.userId || u.uid;
                      const uRole = u.role || (u.isAdmin ? 'admin' : 'user');
                      const isBannedUser = u.isBanned === true;
                      
                      return (
                        <div key={uid} className="p-4 bg-zinc-950/70 border border-zinc-900 rounded-2xl flex flex-col gap-3.5 justify-between">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center font-extrabold text-[#ffa83e] text-xs">
                                {u.avatar || u.username?.slice(0, 2).toUpperCase() || 'FC'}
                              </div>
                              <div className="text-left">
                                <h4 className="font-extrabold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5 flex-wrap">
                                  {u.username || "Guest Athlete"}
                                  {isBannedUser && (
                                    <span className="bg-rose-500/10 border border-rose-500/35 text-rose-400 text-[8.5px] px-1.5 py-0.5 rounded font-extrabold uppercase animate-pulse">
                                      Banned
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 mt-0.5">Joined: {u.joinedDate || "Unknown"}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className={`text-[9.5px] px-2 py-0.5 rounded-full border font-bold ${getUserMeta(uid).color} ${getUserMeta(uid).bg}`}>
                                {getUserMeta(uid).points} PTS • {getUserMeta(uid).rank}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap border-t border-zinc-900 pt-3">
                            {/* Ban Toggle Button */}
                            <button
                              onClick={() => handleToggleUserBan(uid, isBannedUser)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition flex items-center gap-1 ${
                                isBannedUser 
                                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-[#49d180] hover:bg-emerald-500/20' 
                                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              }`}
                            >
                              <Shield className="w-3 h-3" />
                              {isBannedUser ? 'Unban User' : 'Ban User'}
                            </button>

                            {/* Demote / Promote Buttons */}
                            {uRole !== 'admin' ? (
                              <button
                                onClick={() => handleModifyUserRole(uid, 'admin')}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] uppercase font-bold transition"
                              >
                                Promote Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleModifyUserRole(uid, 'user')}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-rose-500/20 text-rose-400 hover:bg-rose-500/5 text-[10px] uppercase font-bold transition"
                              >
                                Demote to User
                              </button>
                            )}

                            {uRole !== 'moderator' && uRole !== 'admin' && (
                              <button
                                onClick={() => handleModifyUserRole(uid, 'moderator')}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] uppercase font-bold transition"
                              >
                                Promote Mod
                              </button>
                            )}

                            {/* Issue Penalty button */}
                            <button
                              onClick={() => handleIssuePenalty(uid)}
                              className="px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 text-[10.5px] uppercase font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <ThumbsDown className="w-3 h-3" /> Issue -20 Penalty
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CATEGORY Master Control */}
              {adminTab === 'categories' && (
                <div className="flex flex-col gap-6 text-left">
                  
                  {/* Category Maker Form */}
                  <form onSubmit={handleAddNewCategory} className="p-5 bg-zinc-950/70 border border-zinc-900 rounded-2xl">
                    <h3 className="text-sm font-black text-rose-400 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-rose-400" /> Create Custom Room Category
                    </h3>
                    <div className="flex gap-2 text-xs flex-col sm:flex-row">
                      <input
                        type="text"
                        placeholder="e.g. ⚽ UCL Live Debates"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full text-zinc-100 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl focus:outline-none focus:border-rose-500 text-left"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-extrabold uppercase transition shrink-0"
                      >
                        Add Category Room
                      </button>
                    </div>
                  </form>

                  {/* List categories with delete */}
                  <div className="p-5 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col gap-3">
                    <h3 className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest border-b border-zinc-800/60 pb-2">Active Rooms List</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {categories.map((c) => {
                        const isSystem = DEFAULT_CATEGORIES.includes(c);
                        return (
                          <div key={c} className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl flex items-center justify-between gap-4">
                            <span className="text-xs font-bold text-zinc-200">{c}</span>
                            
                            {isSystem ? (
                              <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-500 font-bold uppercase">System Room</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(c)}
                                className="p-1 px-2.5 rounded bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 hover:text-rose-500 font-bold text-[10px] uppercase transition-all"
                              >
                                Delete Room
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

          ) : activeSection === 'event' ? (
            
            /* ========================================================
               EVENT PANEL - COMING SOON
               ======================================================== */
            <div className="flex flex-col items-center justify-center min-h-[350px] p-6 text-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border border-white/5 rounded-3xl relative overflow-hidden shadow-2xl">
              {/* Glowing cosmic ambient circle background */}
              <div className="absolute right-0 top-0 w-80 h-80 bg-[#E8472A]/10 blur-3.5xl pointer-events-none rounded-full" />
              <div className="absolute left-1/4 bottom-0 w-60 h-60 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
              
              <div className="relative z-10 flex flex-col items-center gap-3">
                <Flame className="w-12 h-12 text-[#E8472A] fill-[#E8472A]/20 animate-bounce mb-2" />
                <h2 className="font-display text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-350 to-zinc-500 tracking-widest uppercase">
                  Coming Soon
                </h2>
              </div>
            </div>

          ) : (
            
            /* ========================================================
               ACTIVE FEED - DEBATES CARDS VIEW
               ======================================================== */
            <div className="flex flex-col gap-4">
              {filteredPosts.length === 0 ? (
                <div className="p-16 rounded-2xl border border-zinc-900 bg-zinc-950/20 text-center">
                  <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <h3 className="text-zinc-400 text-md font-bold">No Debates Found</h3>
                  <p className="text-zinc-650 text-xs mt-1.5 max-w-sm mx-auto">
                    Try typing different terms, selecting another room collection, or make your own post to start the debate!
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const authorMeta = getUserMeta(post.userId);
                  const isOwner = post.userId === myUid;
                  const isLiked = (post.likedBy || []).includes(myUid);
                  const isDisliked = (post.dislikedBy || []).includes(myUid);
                  const postLikesCount = post.likedBy?.length || post.upvotes || 0;
                  const postDislikesCount = post.dislikedBy?.length || post.downvotes || 0;

                  return (
                    <div
                      key={post.threadId}
                      className={`p-5 md:p-6 rounded-2xl border text-left flex flex-col gap-5 transition-all relative cursor-pointer group bg-gradient-to-b from-[#0e0e12]/95 to-[#050508]/98 backdrop-blur-md ${
                        post.reported 
                          ? 'border-rose-500/40 bg-rose-950/5' 
                          : 'border-zinc-850/80 hover:border-amber-500/30 hover:shadow-[0_0_25px_rgba(245,158,11,0.06)] shadow-lg shadow-black/35'
                      }`}
                      onClick={() => setSelectedPost(post)}
                    >
                      {/* Top Header Row of card info */}
                      <div className="flex justify-between items-start sm:items-center flex-wrap sm:flex-nowrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-amber-500 text-xs shrink-0 shadow-inner">
                            {post.userAvatar || post.username?.slice(0, 2).toUpperCase() || 'FC'}
                          </div>

                          <div className="text-left flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={`/user/${post.username}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (onNavigateToUser) {
                                    onNavigateToUser(post.username);
                                  }
                                }}
                                className="font-extrabold text-sm text-zinc-100 hover:text-amber-400 transition-colors cursor-pointer"
                              >
                                @{post.username}
                              </a>
                              {/* Band rank badge */}
                              <span className={`text-[8px] px-1.5 py-0.5 rounded-md border tracking-wider font-extrabold uppercase ${authorMeta.color} ${authorMeta.bg}`}>
                                {authorMeta.rank}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              {new Date(post.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Category badge Tag */}
                        <div className="bg-amber-500/5 border border-amber-500/15 text-[#ffa83e] text-[9px] font-black px-2.5 py-1 rounded-md tracking-wider uppercase max-w-[200px] truncate shrink-0">
                          {post.category}
                        </div>
                      </div>

                      {/* Content Section clickable details */}
                      <div className="flex flex-col gap-2">
                        <h3 className="text-base md:text-lg font-black text-zinc-100 tracking-tight leading-snug group-hover:text-amber-300 transition-all">
                          {post.title}
                        </h3>
                        <p className="text-zinc-400 text-xs md:text-sm font-sans leading-relaxed break-words whitespace-pre-wrap line-clamp-3">
                          {post.description.length > 280 
                            ? `${post.description.slice(0, 280)}...` 
                            : post.description}
                        </p>
                      </div>

                      {/* Bottom row triggers bar */}
                      <div 
                        className="flex items-center gap-3 border-t border-zinc-900/60 pt-4 text-xs text-zinc-500 font-semibold flex-wrap sm:flex-nowrap"
                        onClick={(e) => e.stopPropagation()} // exclude overlay triggers
                      >
                        {/* Likes button block */}
                        <button
                          onClick={() => handleToggleLike(post.threadId)}
                          className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border text-xs transition-all ${
                            isLiked 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.05)]' 
                              : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs">{postLikesCount}</span>
                        </button>

                        {/* Dislikes button block */}
                        <button
                          onClick={() => handleToggleDislike(post.threadId)}
                          className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border text-xs transition-all ${
                            isDisliked 
                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                              : 'bg-zinc-900/40 border-zinc-900 text-zinc-500 hover:text-zinc-300 hover:border-zinc-800'
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span className="font-mono text-xs">{postDislikesCount}</span>
                        </button>

                        {/* Comments overview trigger */}
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border border-zinc-905 bg-zinc-900/40 text-zinc-550 hover:text-amber-400 hover:border-amber-500/20 transition-all text-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="font-mono">{post.commentsCount || 0}</span>
                        </button>

                        {/* Report Post Trigger */}
                        {!isOwner && (
                          <button
                            onClick={() => {
                              if (isGuest) {
                                triggerNotification("Guest accounts cannot report content.", true);
                                return;
                              }
                              setReportingItem({ id: post.threadId, type: 'post', content: post.title });
                            }}
                            className="text-zinc-650 hover:text-rose-400 transition flex items-center gap-1 ml-auto py-1 px-2.5 hover:bg-rose-500/5 rounded-full text-xs"
                            title="Report Abuse"
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>
                        )}

                        {/* Edit or Delete capability */}
                        {(isOwner || isUserModerator) && (
                          <div className={`flex items-center gap-2 ${isOwner ? 'ml-auto' : ''}`}>
                            {isOwner && (
                              <button
                                onClick={() => openEditPostModal(post)}
                                className="text-zinc-500 hover:text-amber-300 transition flex items-center gap-1 py-1 px-2.5 hover:bg-zinc-900/30 rounded-lg"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            )}

                            {/* Admins get fully distinct RED shield icon indicator as required */}
                            {isUserModerator && !isOwner ? (
                              <button
                                onClick={() => setDeletingItem({ id: post.threadId, type: 'post' })}
                                className="px-2.5 py-1 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-rose-400 transition-all flex items-center gap-1 font-bold text-[9px] uppercase tracking-wide cursor-pointer"
                              >
                                <Shield className="w-3 h-3 text-rose-400" />
                                <span>Moderator Delete</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setDeletingItem({ id: post.threadId, type: 'post' })}
                                className="text-zinc-500 hover:text-rose-400 transition flex items-center gap-1 py-1 px-2.5 hover:bg-[#ef4444]/5 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>

      {/* ========================================================
         MODAL 1: CREATE NEW POST
         ======================================================== */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden p-6 text-left shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h2 className="text-lg font-black bg-gradient-to-r from-amber-400 to-[#ffa83e] bg-clip-text text-transparent uppercase tracking-tight flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-amber-500" /> Initiate Debate Thread
                </h2>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isBanned ? (
                <p className="text-rose-400 text-xs">Write functions are locked for banned participants.</p>
              ) : (
                <form onSubmit={handleCreatePost} className="flex flex-col gap-4">
                  
                  {/* Select Room Category dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Select Room Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full text-zinc-200 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 font-sans uppercase"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Post Title</label>
                    <input
                      type="text"
                      placeholder="Be specific (e.g. Zidane peak vs Iniesta peak...)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      maxLength={150}
                      className="w-full text-zinc-100 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 font-sans text-left"
                    />
                  </div>

                  {/* Description body */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Discussion Body Content</label>
                    <textarea
                      placeholder="Provide evidence, stats, tactical insights, or opinion details..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      required
                      rows={5}
                      maxLength={2400}
                      className="w-full text-zinc-100 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 font-sans text-left"
                    />
                  </div>

                  {/* Actions buttons */}
                  <div className="flex justify-end gap-2 border-t border-zinc-900 pt-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 text-xs rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-zinc-950 font-black tracking-tight hover:shadow-lg transition-all"
                    >
                      Publish Thread
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
         MODAL 2: EDIT EXISTING POST
         ======================================================== */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-3xl p-6 text-left shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <h2 className="text-lg font-black bg-gradient-to-r from-amber-400 to-[#ffa83e] bg-clip-text text-transparent uppercase tracking-tight">
                  Edit Thread Settings
                </h2>
                <button 
                  onClick={() => setEditingPost(null)}
                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditPost} className="flex flex-col gap-4">
                
                {/* Edit category too */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Select Room Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-zinc-200 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 uppercase"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Title edit */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Thread Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    maxLength={150}
                    className="w-full text-zinc-105 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-left"
                  />
                </div>

                {/* Content edit */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-wider">Body Content</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    rows={5}
                    maxLength={2400}
                    className="w-full text-zinc-105 text-xs bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-amber-500 text-left"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-zinc-900 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="px-4 py-2 text-xs rounded-xl bg-zinc-900 text-zinc-400 hover:bg-zinc-850"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-zinc-950 font-black tracking-tight transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
         MODAL 3: DISPATCH REPORT ABUSE MODAL
         ======================================================== */}
      <AnimatePresence>
        {reportingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-3xl p-6 text-left shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                <h2 className="text-md font-black text-rose-400 uppercase tracking-tight flex items-center gap-1.5">
                  <Flag className="w-5 h-5 text-rose-500" /> Report Content
                </h2>
                <button onClick={() => setReportingItem(null)} className="p-1 rounded bg-zinc-900 text-zinc-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="flex flex-col gap-4 text-xs">
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-850 italic text-zinc-400 line-clamp-3">
                  "{reportingItem.content}"
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-[#ffa83e] uppercase tracking-wider">Select Policy Infraction</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-rose-500"
                  >
                    <option value="Off-topic or irrelevant">Off-topic or irrelevant</option>
                    <option value="Harassment or targeting athletes">Harassment or targeting athletes</option>
                    <option value="Toxicity, hateful conduct, or insults">Toxicity, hateful conduct, or insults</option>
                    <option value="Spamming or promotional ads">Spamming or promotional ads</option>
                    <option value="Fake predictions news, misinformation">Fake predictions news, misinformation</option>
                    <option value="Other">Other Infraction</option>
                  </select>
                </div>

                <p className="text-[10px] text-zinc-500 leading-normal">
                  Filing a report relays target hashes to system moderators instantly. Intentionally filing fake reports is grounds for penalty points.
                </p>

                <div className="flex justify-end gap-1.5 border-t border-zinc-900 pt-3">
                  <button
                    type="button"
                    onClick={() => setReportingItem(null)}
                    className="px-3 py-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 font-bold uppercase transition"
                  >
                    Submit Flag Report
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
         MODAL 4: FULL POST DETAILED COMMENTS TREE OVERLAY View
         ======================================================== */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex justify-end">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 210 }}
              className="w-full max-w-2xl bg-zinc-950 md:border-l border-zinc-900 shadow-2xl h-screen flex flex-col text-left overflow-hidden"
            >
              {/* Overlay header */}
              <div className="shrink-0 bg-[#0e0e12]/95 border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-black text-zinc-100 uppercase tracking-widest">Discussion Area</span>
                </div>
                
                <button
                  onClick={() => setSelectedPost(null)}
                  className="p-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition flex items-center gap-1 text-xs font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Close
                </button>
              </div>

              {/* Pinned Debate Context Card - ALWAYS visible at the top */}
              <div className={`shrink-0 bg-gradient-to-b from-[#101015] to-[#060609] border-b border-zinc-900/95 transition-all duration-300 ${
                isScrolled 
                  ? 'p-3 md:p-3.5 shadow-md' 
                  : 'p-5 md:p-6 shadow-xl shadow-black/25'
              }`}>
                {/* Metadata row */}
                {!isScrolled && (
                  <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                    {(() => {
                      const lowerCat = selectedPost.category ? selectedPost.category.toLowerCase() : '';
                      const dbChar = characters.find(c => 
                        c.id.toLowerCase() === lowerCat || 
                        c.name.toLowerCase().includes(lowerCat) ||
                        lowerCat.includes(c.id.toLowerCase())
                      );
                      
                      if (dbChar) {
                        return (
                          <a
                            href={`/player/${dbChar.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedPost(null);
                              window.history.pushState(null, '', `/player/${dbChar.id}`);
                              const popEvent = new PopStateEvent('popstate');
                              window.dispatchEvent(popEvent);
                            }}
                            className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/15 hover:border-amber-500/30 text-[#ffa83e] hover:text-amber-400 text-[10px] font-black px-2.5 py-1 rounded tracking-wider uppercase flex items-center gap-1 transition-all cursor-pointer"
                            title={`View ${dbChar.name} Player Profile Stats`}
                          >
                            <span>{selectedPost.category}</span>
                            <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
                          </a>
                        );
                      }
                      
                      return (
                        <span className="bg-amber-500/10 border border-amber-500/15 text-[#ffa83e] text-[9px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
                          {selectedPost.category}
                        </span>
                      );
                    })()}
                    <span className="text-zinc-700 font-bold">•</span>
                    <span className="text-zinc-500 text-[10px]">Initiated by</span>
                    <a
                      href={`/user/${selectedPost.username}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (onNavigateToUser) {
                          onNavigateToUser(selectedPost.username);
                        }
                      }}
                      className="font-extrabold text-[#ffa03f] hover:underline cursor-pointer"
                    >
                      @{selectedPost.username}
                    </a>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-md border tracking-wide font-extrabold uppercase ${getUserMeta(selectedPost.userId).color} ${getUserMeta(selectedPost.userId).bg}`}>
                      {getUserMeta(selectedPost.userId).rank}
                    </span>
                    <span className="ml-auto text-zinc-550 font-mono text-[10px]">
                      {new Date(selectedPost.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                {/* Title and stats container */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-4">
                    <h1 className={`font-black text-zinc-50 tracking-tight leading-snug transition-all duration-300 ${
                      isScrolled ? 'text-xs md:text-sm line-clamp-1' : 'text-base md:text-lg'
                    }`}>
                      {selectedPost.title}
                    </h1>
                    {isScrolled && (
                      <span className="shrink-0 bg-amber-500/10 border border-amber-500/15 text-[#ffa83e] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {selectedPost.category}
                      </span>
                    )}
                  </div>
                  
                  {/* Scrollable description box under height limits */}
                  {!isScrolled && selectedPost.description && (
                    <div className="max-h-24 overflow-y-auto pr-2 font-sans text-xs text-zinc-350 leading-relaxed bg-zinc-950/50 border border-zinc-900 p-3 rounded-xl whitespace-pre-wrap mt-1">
                      {selectedPost.description}
                    </div>
                  )}
                  
                  {/* Interactive stats totals row */}
                  <div className={`flex items-center gap-2 text-xs text-zinc-500 flex-wrap ${isScrolled ? 'mt-0.5' : 'mt-2'}`}>
                    <span className="bg-zinc-900/60 px-2 py-1 rounded-full border border-zinc-850/80 flex items-center gap-1 font-mono text-[9px]">
                      👍 <span className="text-zinc-300 font-bold">{selectedPost.likedBy?.length || selectedPost.upvotes || 0}</span>
                    </span>
                    <span className="bg-zinc-900/60 px-2 py-1 rounded-full border border-zinc-850/80 flex items-center gap-1 font-mono text-[9px]">
                      👎 <span className="text-zinc-300 font-bold">{selectedPost.dislikedBy?.length || selectedPost.downvotes || 0}</span>
                    </span>
                    <span className="bg-zinc-900/60 px-2 py-1 rounded-full border border-zinc-850/85 flex items-center gap-1 font-mono text-[9px] text-amber-400 font-extrabold ml-1">
                      <MessageSquare className="w-2.5 h-2.5 text-amber-500" />
                      <span>{selectedPost.commentsCount || 0} discussions</span>
                    </span>
                    {isScrolled && (
                      <span className="ml-auto text-[9px] text-zinc-500">
                        by <a
                          href={`/user/${selectedPost.username}`}
                          onClick={(e) => {
                            e.preventDefault();
                            if (onNavigateToUser) {
                              onNavigateToUser(selectedPost.username);
                            }
                          }}
                          className="hover:underline text-zinc-400 hover:text-white cursor-pointer"
                        >
                          @{selectedPost.username}
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Comments Area below pinned context */}
              <div 
                onScroll={(e) => {
                  setIsScrolled(e.currentTarget.scrollTop > 40);
                }}
                className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col gap-6"
              >

                {/* FLAT CHRONOLOGICAL COMMENTS FEED */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900/80 pb-2.5 font-bold text-xs uppercase tracking-wider text-zinc-400">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500" /> 
                    <span>Live Discussion Feed</span>
                  </div>

                  {/* Render comments flat ordered by timestamp ascending */}
                  <div className="flex flex-col gap-6">
                    {(() => {
                      const postComments = allComments.filter(
                        c => c.postId === selectedPost.threadId || c.characterId === selectedPost.threadId
                      );
                      if (postComments.length === 0) {
                        return <p className="text-zinc-600 text-xs pl-1">No comments posted yet. Start the discussion!</p>;
                      }
                      return postComments.map((comment) => {
                        const isOwner = comment.userId === myUid;
                        const isLiked = (comment.likedBy || []).includes(myUid);
                        const isDisliked = (comment.dislikedBy || []).includes(myUid);
                        const showInlineEdit = editingCommentId === comment.id;

                        // Calculate badges dynamically
                        const authorMeta = getUserMeta(comment.userId);
                        const isReply = !!comment.replyToUsername;

                        return (
                          <div 
                            key={comment.id}
                            className={`flex gap-3 text-left relative group ${isReply ? 'pl-8 md:pl-10 ml-2' : ''}`}
                          >
                            {/* Curved link thread line like Facebook comments! */}
                            {isReply && (
                              <div className="absolute -left-3 top-0 bottom-6 w-5 border-l border-b border-zinc-800 rounded-bl-xl pointer-events-none opacity-50" />
                            )}

                            {/* User avatar on Left */}
                            <div className={`rounded-full bg-[#16161c] border border-zinc-800 flex items-center justify-center font-black text-amber-500 shrink-0 shadow-inner select-none ${
                              isReply ? 'w-7 h-7 text-[9px]' : 'w-9 h-9 text-xs'
                            }`}>
                              {comment.username?.slice(0, 2).toUpperCase() || 'FC'}
                            </div>

                            {/* Right bubble container */}
                            <div className="flex-1 flex flex-col items-start min-w-0">
                              {/* Unified speech bubble */}
                              <div className={`p-3 px-4 rounded-2xl relative ${
                                comment.reported 
                                  ? 'border border-rose-500/30 bg-rose-950/15 text-rose-300' 
                                  : 'bg-zinc-900/60 hover:bg-zinc-900/80 text-zinc-150 transition-all duration-150'
                              } w-auto max-w-full shadow-sm`}>
                                {/* Header username / rank line */}
                                <div className="flex items-center gap-2 flex-wrap text-xs mb-1 select-none">
                                  <a
                                    href={`/user/${comment.username}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (onNavigateToUser) {
                                        onNavigateToUser(comment.username);
                                      }
                                    }}
                                    className="font-extrabold text-[#ffa03f] hover:underline cursor-pointer"
                                  >
                                    @{comment.username}
                                  </a>
                                  <span className={`text-[7.5px] px-1 py-0.2 rounded font-extrabold uppercase ${authorMeta.color} ${authorMeta.bg_border || authorMeta.bg}`}>
                                    {authorMeta.rank}
                                  </span>
                                  {isReply && (
                                    <span className="text-[10px] text-zinc-550 lowercase">
                                      rep <a
                                        href={`/user/${comment.replyToUsername}`}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (onNavigateToUser) {
                                            onNavigateToUser(comment.replyToUsername);
                                          }
                                        }}
                                        className="hover:underline text-zinc-400 hover:text-white cursor-pointer"
                                      >
                                        @{comment.replyToUsername}
                                      </a>
                                    </span>
                                  )}
                                </div>

                                {/* Main Text/Box body inside bubble */}
                                {showInlineEdit ? (
                                  <div className="flex flex-col gap-2 mt-1 w-64 md:w-80">
                                    <textarea
                                      value={editingCommentText}
                                      onChange={(e) => setEditingCommentText(e.target.value)}
                                      className="w-full text-zinc-150 text-xs bg-zinc-950 border border-amber-500/30 rounded-xl p-3 focus:outline-none focus:border-amber-500 font-sans"
                                      rows={2}
                                      maxLength={1500}
                                    />
                                    <div className="flex justify-end gap-1.5 text-[10px]">
                                      <button 
                                        onClick={() => setEditingCommentId(null)}
                                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-300 text-zinc-400 font-semibold transition"
                                      >
                                        Cancel
                                      </button>
                                      <button 
                                        onClick={() => handleSaveCommentEdit(comment.id)}
                                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-extrabold hover:bg-amber-600 transition"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-zinc-200 text-xs md:text-sm font-sans leading-relaxed break-words whitespace-pre-wrap pl-0.5">
                                    {comment.text}
                                  </p>
                                )}

                                {/* Reaction Pill Overlay at bottom right (Facebook comments style!) */}
                                {((comment.upvotes || 0) > 0 || (comment.downvotes || 0) > 0) && (
                                  <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-850 px-1.5 py-0.5 rounded-full text-[9px] font-mono shadow-md absolute -bottom-2.5 right-4 pointer-events-none select-none">
                                    {(comment.upvotes || 0) > 0 && (
                                      <span className="flex items-center gap-0.5 text-amber-500">
                                        👍 {comment.upvotes}
                                      </span>
                                    )}
                                    {(comment.downvotes || 0) > 0 && (
                                      <span className="flex items-center gap-0.5 text-rose-400">
                                        👎 {comment.downvotes}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Facebook styled Actions line directly below the bubble */}
                              <div className="flex items-center gap-2.5 mt-1.5 pl-2 text-[10px] text-zinc-500 font-bold select-none flex-wrap">
                                {/* Time display */}
                                <span className="font-mono font-medium text-zinc-600">
                                  {new Date(comment.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span>•</span>

                                {/* Like Link */}
                                <button
                                  onClick={() => handleLikeComment(comment.id)}
                                  className={`hover:underline cursor-pointer transition-colors ${
                                    isLiked ? 'text-amber-400' : 'hover:text-zinc-300'
                                  }`}
                                >
                                  Like
                                </button>
                                <span>•</span>

                                {/* Dislike Link */}
                                <button
                                  onClick={() => handleDislikeComment(comment.id)}
                                  className={`hover:underline cursor-pointer transition-colors ${
                                    isDisliked ? 'text-rose-400' : 'hover:text-zinc-300'
                                  }`}
                                >
                                  Dislike
                                </button>

                                {!isBanned && (
                                  <>
                                    <span>•</span>
                                    <button
                                      onClick={() => handleReplyClick(comment.username)}
                                      className="hover:underline cursor-pointer hover:text-amber-400 text-zinc-500 transition-colors"
                                    >
                                      Reply
                                    </button>
                                  </>
                                )}

                                {!isOwner && (
                                  <>
                                    <span>•</span>
                                    <button
                                      onClick={() => setReportingItem({ id: comment.id, type: 'comment', content: comment.text })}
                                      className="hover:underline cursor-pointer hover:text-rose-450 text-zinc-600 transition-colors"
                                      title="Report Comment"
                                    >
                                      Report
                                    </button>
                                  </>
                                )}

                                {(isOwner || isUserModerator) && (
                                  <>
                                    <span>•</span>
                                    <div className="inline-flex items-center gap-1.5">
                                      {isOwner && !showInlineEdit && (
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditingCommentText(comment.text);
                                          }}
                                          className="hover:underline cursor-pointer hover:text-amber-500 text-zinc-550 transition-colors"
                                        >
                                          Edit
                                        </button>
                                      )}

                                      {isUserModerator && !isOwner ? (
                                        <button
                                          onClick={() => setDeletingItem({ id: comment.id, type: 'comment', parentPostId: selectedPost.threadId })}
                                          className="hover:underline text-rose-450 cursor-pointer hover:text-rose-400 transition-colors font-bold"
                                        >
                                          Kill
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => setDeletingItem({ id: comment.id, type: 'comment', parentPostId: selectedPost.threadId })}
                                          className="hover:underline cursor-pointer hover:text-rose-450 text-zinc-550 transition-colors"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

              </div>

              {/* Docked Comment Form Box at bottom */}
              <div className="shrink-0 bg-[#0c0c0e] border-t border-zinc-900/90 p-4 md:px-6 md:py-4 flex flex-col gap-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
                <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> Join the Debate
                </h3>
                
                {isBanned ? (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" /> Comments are banned for this profile.
                  </div>
                ) : (
                  <form onSubmit={(e) => handleAddRootComment(e, selectedPost.threadId)} className="flex flex-col gap-2">
                    <textarea
                      ref={commentInputRef}
                      placeholder="Contribute text insight to this debate pool... (use @username to reply)"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      required
                      className="w-full text-zinc-150 placeholder-zinc-600 text-xs bg-zinc-900/40 border border-zinc-850 rounded-xl p-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/15 text-left font-sans transition-all"
                      rows={2}
                      maxLength={1500}
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-tr from-amber-500 to-amber-600 text-zinc-950 font-black rounded-lg text-[11px] flex items-center gap-1 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                      >
                        <Send className="w-3 h-3" /> Submit Comment
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
         MODAL 5: CONFIRM DELETE OVERLAY MODAL (Required Popup)
         ======================================================== */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-950 border border-rose-500/30 rounded-3xl p-6 text-left shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
                <h2 className="text-base font-black text-rose-400 uppercase tracking-tight">Confirm Deletion</h2>
              </div>

              <div className="text-zinc-300 text-xs flex flex-col gap-2">
                <p className="font-bold">Are you sure you want to delete this {deletingItem.type}?</p>
                <p className="text-zinc-550 leading-relaxed text-[11px]">
                  This operation is permanent. It cascade-deletes all associated child replies, comments, and reports indexes synchronously. It cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-zinc-900 pt-3.5">
                <button
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deletingItem.type === 'post') {
                      executeDeletePost(deletingItem.id);
                    } else {
                      executeDeleteComment(deletingItem.id, deletingItem.parentPostId);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-400 font-extrabold uppercase text-xs"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
