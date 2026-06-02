
import React, { useState } from 'react';
import { Post, UserProfile, Comment, Contact } from '../types';
import { Button } from './Button';

interface FriendHighNotesProps {
  friend: Contact;
  posts: Post[];
  currentUser: UserProfile;
  onBack: () => void;
  onLike: (postId: string) => void;
  onDislike: (postId: string) => void;
  onComment: (postId: string, text: string) => void;
  onLikeComment: (postId: string, commentId: string) => void;
}

// Simplified Comment Item
const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
    <div className="mt-2 flex gap-2 items-start bg-gray-50 p-2 rounded-lg border border-gray-200">
        <img src={comment.authorAvatar} className="w-6 h-6 rounded-full border border-black" />
        <div className="min-w-0 flex-1">
            <span className="font-bold text-xs mr-2">{comment.authorName}</span>
            <span className="text-xs text-gray-600">{comment.text}</span>
        </div>
    </div>
);

export const FriendHighNotes: React.FC<FriendHighNotesProps> = ({ 
  friend,
  posts, 
  currentUser, 
  onBack, 
  onLike,
  onDislike,
  onComment,
  onLikeComment
}) => {
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Filter posts for this specific friend
  const friendPosts = posts.filter(p => p.authorId === friend.id);

  const handleSubmitComment = (postId: string) => {
      if (!commentText.trim()) return;
      onComment(postId, commentText);
      setCommentText('');
  };

  return (
    <div className="flex flex-col h-full bg-indigo-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
        <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
          ←
        </button>
        <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-wider uppercase">{friend.name}'s Notes</h1>
            <span className="text-xs font-bold text-gray-500 uppercase">{friend.species}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {friendPosts.length === 0 ? (
            <div className="text-center mt-20 opacity-50">
                <div className="text-6xl mb-4">📝</div>
                <p className="font-bold text-xl">No posts yet.</p>
                <p>Check back later!</p>
            </div>
        ) : (
            friendPosts.map(post => {
                const isLiked = post.likedBy.includes(currentUser.id);
                const isDisliked = post.dislikedBy.includes(currentUser.id);
                
                return (
                    <div key={post.id} className="bg-white border-4 border-black rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-start mb-2">
                             <p className="font-medium text-lg text-gray-800 leading-snug">{post.content}</p>
                        </div>
                        <span className="text-xs font-bold text-gray-400 block mb-3">
                            {new Date(post.timestamp).toLocaleDateString()}
                        </span>

                        {/* Interactions */}
                        <div className="flex items-center gap-4 border-t-2 border-gray-100 pt-3">
                            <button 
                                onClick={() => onLike(post.id)}
                                className={`flex items-center gap-1 font-bold ${isLiked ? 'text-pink-500' : 'text-gray-400'}`}
                            >
                                <span className="text-xl">♥</span> {post.likes}
                            </button>
                            
                            <button 
                                onClick={() => onDislike(post.id)}
                                className={`flex items-center gap-1 font-bold ${isDisliked ? 'text-black' : 'text-gray-400'}`}
                            >
                                <span className="text-xl">👎</span> {post.dislikes}
                            </button>

                            <button 
                                onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                                className="flex items-center gap-1 font-bold text-gray-400 hover:text-blue-500 ml-auto"
                            >
                                <span>💬</span> {post.comments.length}
                            </button>
                        </div>

                        {/* Comments Area */}
                        {activeCommentPostId === post.id && (
                            <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200 animate-fadeIn">
                                <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                                    {post.comments.length === 0 && <p className="text-xs text-gray-400 italic">No comments.</p>}
                                    {post.comments.map(c => (
                                        <CommentItem key={c.id} comment={c} />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Reply..."
                                        className="flex-1 border-2 border-black rounded-lg px-2 py-1 font-bold text-sm focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => handleSubmitComment(post.id)}
                                        className="bg-blue-400 text-white font-bold px-3 rounded-lg border-2 border-black hover:bg-blue-500 text-xs"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};
