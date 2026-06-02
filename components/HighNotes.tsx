
import React, { useState } from 'react';
import { Post, UserProfile, Comment } from '../types';
import { Button } from './Button';

interface HighNotesProps {
    posts: Post[];
    currentUser: UserProfile;
    onBack: () => void;
    onCreatePost: (text: string) => void;
    onLike: (postId: string) => void;
    onDislike: (postId: string) => void;
    onComment: (postId: string, text: string, parentCommentId?: string) => void;
    onLikeComment: (postId: string, commentId: string) => void;
    focusedPostId?: string | null;
}

// Recursive Comment Component
const CommentItem: React.FC<{
    comment: Comment;
    postId: string;
    currentUser: UserProfile;
    onReply: (postId: string, text: string, parentId: string) => void;
    onLike: (postId: string, commentId: string) => void;
    depth?: number;
}> = ({ comment, postId, currentUser, onReply, onLike, depth = 0 }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [showReplies, setShowReplies] = useState(false);

    const isLiked = comment.likedBy.includes(currentUser.id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    const handleReplySubmit = () => {
        if (!replyText.trim()) return;
        onReply(postId, replyText, comment.id);
        setReplyText('');
        setIsReplying(false);
        setShowReplies(true); // Auto expand when replying
    };

    return (
        <div className={`mt-3 ${depth > 0 ? 'ml-4 border-l-2 border-gray-200 pl-3' : ''}`}>
            <div className="flex gap-2 items-start">
                <img
                    src={comment.authorAvatar}
                    alt={comment.authorName}
                    className="w-8 h-8 rounded-full border border-black bg-white object-cover flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                    <div className="bg-gray-50 p-3 rounded-xl rounded-tl-none border border-gray-200">
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-xs block truncate">{comment.authorName}</span>
                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm my-1 break-words">{comment.text}</p>

                        {/* Comment Actions */}
                        <div className="flex gap-4 mt-2">
                            <button
                                onClick={() => onLike(postId, comment.id)}
                                className={`text-xs font-bold flex items-center gap-1 ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-black'}`}
                            >
                                <span>♥</span> {comment.likes || 0}
                            </button>
                            <button
                                onClick={() => setIsReplying(!isReplying)}
                                className="text-xs font-bold text-gray-400 hover:text-blue-500"
                            >
                                Reply
                            </button>
                        </div>
                    </div>

                    {/* Reply Input */}
                    {isReplying && (
                        <div className="mt-2 flex gap-2 animate-fadeIn">
                            <input
                                type="text"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Reply to ${comment.authorName}...`}
                                className="flex-1 border-2 border-black rounded-lg px-2 py-1 font-bold text-xs focus:outline-none"
                                autoFocus
                            />
                            <button
                                onClick={handleReplySubmit}
                                className="bg-blue-400 text-white font-bold px-2 rounded-lg border-2 border-black hover:bg-blue-500 text-xs"
                            >
                                Send
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Nested Replies Toggle */}
            {hasReplies && (
                <div className="mt-2 ml-10">
                    {!showReplies ? (
                        <button
                            onClick={() => setShowReplies(true)}
                            className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:underline"
                        >
                            <span className="w-4 h-0.5 bg-blue-300"></span>
                            View {comment.replies.length} replies
                        </button>
                    ) : (
                        <div>
                            <button
                                onClick={() => setShowReplies(false)}
                                className="text-xs font-bold text-gray-400 mb-2 hover:underline"
                            >
                                Hide replies
                            </button>
                            <div className="space-y-2">
                                {comment.replies.map(reply => (
                                    <CommentItem
                                        key={reply.id}
                                        comment={reply}
                                        postId={postId}
                                        currentUser={currentUser}
                                        onReply={onReply}
                                        onLike={onLike}
                                        depth={depth + 1}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const HighNotes: React.FC<HighNotesProps> = ({
    posts,
    currentUser,
    onBack,
    onCreatePost,
    onLike,
    onDislike,
    onComment,
    onLikeComment,
    focusedPostId
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newPostText, setNewPostText] = useState('');
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(focusedPostId || null);
    const [commentText, setCommentText] = useState('');

    const handlePostSubmit = () => {
        if (!newPostText.trim()) return;
        onCreatePost(newPostText);
        setNewPostText('');
        setIsCreating(false);
    };

    const handleMainCommentSubmit = (postId: string) => {
        if (!commentText.trim()) return;
        onComment(postId, commentText);
        setCommentText('');
        // Don't close the section, let them see their comment
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const buildCommentTree = (comments: Comment[]): Comment[] => {
        const commentMap = new Map<string, Comment>();
        const roots: Comment[] = [];

        // 1. Initialize map with shallow copies
        comments.forEach(c => {
            commentMap.set(c.id, { ...c, replies: [] });
        });

        // 2. Link children to parents
        comments.forEach(c => {
            const mappedComment = commentMap.get(c.id)!;
            // Support both naming conventions just in case mapping failed elsewhere
            const parentId = c.parentId || (c as any).parent_id;

            if (parentId && commentMap.has(parentId)) {
                const parent = commentMap.get(parentId)!;
                if (!parent.replies) parent.replies = [];
                parent.replies.push(mappedComment);
            } else {
                roots.push(mappedComment);
            }
        });

        // 3. Sort by time
        return roots.sort((a, b) => a.timestamp - b.timestamp);
    };

    return (
        <div className="flex flex-col h-full bg-indigo-50 overflow-hidden relative">
            {/* Header */}
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center justify-between shadow-md">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-3 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
                        ←
                    </button>
                    <h1 className="text-xl font-black tracking-wider uppercase">High Notes</h1>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="w-10 h-10 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center text-2xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                >
                    +
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
                {focusedPostId && (
                    <div className="bg-indigo-100/50 p-2 rounded-xl border-2 border-dashed border-indigo-300 flex justify-center mb-2">
                        <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Detail View</span>
                    </div>
                )}

                {posts.filter(p => !focusedPostId || p.id === focusedPostId).length === 0 && (
                    <div className="text-center mt-20 opacity-50">
                        <p className="font-bold text-xl">It's quiet here...</p>
                        <p>Be the first to post!</p>
                    </div>
                )}

                {posts
                    .filter(p => !focusedPostId || p.id === focusedPostId)
                    .map(post => {
                        const isLiked = post.likedBy.includes(currentUser.id);
                        const isDisliked = post.dislikedBy.includes(currentUser.id);
                        // Count total from raw list since tree hides them
                        const totalComments = post.comments.length;
                        const rootComments = buildCommentTree(post.comments);

                        const isPending = post.status === 'pending';
                        const isError = post.status === 'error';

                        return (
                            <div key={post.id} className={`bg-white border-4 ${isError ? 'border-red-500 bg-red-50' : 'border-black'} rounded-3xl p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isPending ? 'opacity-50' : ''}`}>
                                {isError && (
                                    <div className="mb-2 px-3 py-1 bg-red-200 text-red-700 font-black rounded-full text-xs inline-block">
                                        ⚠️ Draft (Unsent): {post.errorReason}
                                    </div>
                                )}
                                {/* Author Info */}
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={post.authorAvatar} className="w-12 h-12 rounded-full border-2 border-black bg-gray-100 object-cover" />
                                    <div>
                                        <h3 className="font-black text-lg leading-tight">{post.authorName}</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase">{post.authorSpecies} • {formatTime(post.timestamp)}</p>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="mb-4">
                                    <p className="font-medium text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4 border-t-2 border-gray-100 pt-3">
                                    <button
                                        onClick={() => onLike(post.id)}
                                        className={`flex items-center gap-1 font-bold transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'}`}
                                    >
                                        <span className="text-xl">♥</span> {post.likes}
                                    </button>

                                    <button
                                        onClick={() => onDislike(post.id)}
                                        className={`flex items-center gap-1 font-bold transition-colors ${isDisliked ? 'text-black' : 'text-gray-400 hover:text-black'}`}
                                    >
                                        <span className="text-xl">👎</span> {post.dislikes}
                                    </button>

                                    <button
                                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                                        className="flex items-center gap-1 font-bold text-gray-400 hover:text-blue-500 ml-auto"
                                    >
                                        <span>💬</span> {totalComments}
                                    </button>
                                </div>

                                {/* Comments Section */}
                                {activeCommentPostId === post.id && (
                                    <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 animate-fadeIn">

                                        {/* Main Comment Input */}
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder="Write a comment..."
                                                className="flex-1 border-2 border-black rounded-xl px-3 py-2 font-bold text-sm focus:outline-none focus:ring-2 ring-blue-200"
                                            />
                                            <button
                                                onClick={() => handleMainCommentSubmit(post.id)}
                                                className="bg-blue-400 text-white font-bold px-4 rounded-xl border-2 border-black hover:bg-blue-500 text-sm"
                                            >
                                                Post
                                            </button>
                                        </div>

                                        <div className="space-y-4 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                                            {rootComments.length === 0 ? (
                                                <p className="text-xs text-gray-400 italic text-center py-2">No comments yet.</p>
                                            ) : (
                                                rootComments.map(comment => (
                                                    <CommentItem
                                                        key={comment.id}
                                                        comment={comment}
                                                        postId={post.id}
                                                        currentUser={currentUser}
                                                        onReply={onComment}
                                                        onLike={onLikeComment}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
            </div>

            {/* Create Post Modal */}
            {isCreating && (
                <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-black text-2xl">New Post</h2>
                            <button onClick={() => setIsCreating(false)} className="text-gray-400 font-bold hover:text-black">✕</button>
                        </div>

                        <textarea
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            placeholder="What's on your mind?"
                            className="w-full h-32 border-4 border-black rounded-xl p-4 font-bold text-lg resize-none focus:outline-none focus:ring-4 ring-yellow-200 mb-4"
                        />

                        <Button onClick={handlePostSubmit} fullWidth disabled={!newPostText.trim()}>
                            Publish
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
