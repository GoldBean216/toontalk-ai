import React, { useEffect, useState } from 'react';
import { Notification } from '../types';

interface NotificationsProps {
    notifications: Notification[];
    onBack: () => void;
    onMarkAsRead: (id: string) => void;
    onSelectPost: (postId: string) => void;
}

import { useLanguage } from '../lib/language-context';

export const Notifications: React.FC<NotificationsProps> = ({ notifications, onBack, onMarkAsRead, onSelectPost }) => {
    const { t } = useLanguage();
    const [acceptedIds, setAcceptedIds] = useState<string[]>([]);

    useEffect(() => {
        notifications.filter(n => !n.isRead).forEach(n => onMarkAsRead(n.id));
    }, [notifications.length]);

    const handleAcceptFriend = async (n: Notification) => {
        setAcceptedIds(prev => [...prev, n.id]);
        try {
            // Use 'fromId' if available (added to types), fall back to 'postId' (sender id hack)
            const senderId = n.fromId || n.postId;
            if (!senderId) {
                alert("Invalid request data");
                return;
            }

            await fetch('/api/friend-request/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: n.userId, senderId })
            });
            // Success
        } catch (e) {
            console.error(e);
            alert("Failed to accept");
            setAcceptedIds(prev => prev.filter(id => id !== n.id));
        }
    };

    const getNotificationText = (n: Notification) => {
        switch (n.type) {
            case 'like_post': return t.likedPost || 'liked your post';
            case 'comment_post': return t.commentedPost || 'commented on your post';
            case 'reply_comment': return t.repliedComment || 'replied to your comment';
            case 'friend_request': return t.sentFriendReq || 'sent a notification';
            default: return t.sentNotification || 'sent you a notification';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'like_post': return '❤️';
            case 'comment_post': return '💬';
            case 'reply_comment': return '↩️';
            case 'friend_request': return '👋';
            default: return '🔔';
        }
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center p-4 bg-indigo-600 text-white border-b-4 border-black">
                <button onClick={onBack} className="mr-4 text-2xl font-bold hover:scale-110 transition-transform">←</button>
                <h2 className="text-xl font-black tracking-tight uppercase">{t.notificationsTitle || 'Notifications'}</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notifications.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <div className="text-6xl opacity-20 text-indigo-200 uppercase font-black rotate-12">{t.quiet || 'Quiet...'}</div>
                        <p className="font-bold">{t.noNotifications || 'No notifications yet!'}</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => n.type !== 'friend_request' && n.postId && onSelectPost(n.postId)}
                            className={`p-4 rounded-2xl border-4 border-black transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${n.isRead ? 'bg-white opacity-80' : 'bg-indigo-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className="relative">
                                    <img src={n.fromAvatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=placeholder'} alt="" className="w-12 h-12 rounded-full border-2 border-black bg-white" />
                                    <div className="absolute -bottom-1 -right-1 text-xs">{getIcon(n.type)}</div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black">
                                        <span className="text-indigo-600 italic">{n.fromName}</span> {getNotificationText(n)}
                                    </p>

                                    {/* Content Snippet */}
                                    <div className="mt-2 p-2 bg-black/5 rounded-lg border-2 border-dashed border-black/10 text-xs text-gray-500 italic truncate">
                                        "{n.postContent}"
                                    </div>

                                    {/* Friend Request Actions */}
                                    {n.type === 'friend_request' && n.postContent.includes('Sent you') && (
                                        <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleAcceptFriend(n)}
                                                disabled={acceptedIds.includes(n.id)}
                                                className="bg-green-500 text-white px-4 py-2 rounded-xl border-2 border-black font-bold text-xs hover:bg-green-600 disabled:bg-gray-400 disabled:border-2 disabled:border-gray-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                                            >
                                                {acceptedIds.includes(n.id) ? (t.friendAdded || 'Friend Added!') : (t.acceptRequest || 'Accept Request')}
                                            </button>
                                        </div>
                                    )}

                                    {/* Comment/Reply Detail */}
                                    {n.commentText && (
                                        <div className="mt-2 pl-3 border-l-4 border-indigo-200">
                                            <p className="text-xs font-bold text-gray-700 bg-indigo-100/50 p-2 rounded">
                                                {n.type === 'reply_comment' ? `${t.youPrefix || 'You: '}${n.commentText}` : n.commentText}
                                            </p>
                                            {n.replyText && (
                                                <p className="mt-1 text-sm font-black text-indigo-600 ml-2">
                                                    ↳ {n.replyText}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase">
                                        {new Date(n.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
