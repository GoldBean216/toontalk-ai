import React from 'react';
import { Contact } from '../../types';

interface SocialWaitingModalProps {
    initiator: Contact | null;
    targets: Contact[];
    activityType: 'chat' | 'date' | 'quarrel';
    status: 'idle' | 'waiting' | 'accepted' | 'rejected';
    onClose: () => void;
    language: string;
}

export const SocialWaitingModal: React.FC<SocialWaitingModalProps> = ({
    initiator,
    targets,
    activityType,
    status,
    onClose,
    language
}) => {
    const isChinese = language === "简体中文";
    const isJapanese = language === "日本語";

    const t = {
        waiting: isChinese ? "等待回应中" : isJapanese ? "返答待ち" : "Waiting for Response",
        accepted: isChinese ? "接受邀请！🎉" : isJapanese ? "招待を受け入れました！🎉" : "Invitation Accepted! 🎉",
        rejected: isChinese ? "暂时婉拒 💤" : isJapanese ? "辞退されました 💤" : "Invitation Declined 💤",
        cancel: isChinese ? "取消等待" : isJapanese ? "待機キャンセル" : "Cancel Waiting",
        close: isChinese ? "关闭" : isJapanese ? "閉じる" : "Close",
        chatMsg: isChinese ? "正在向好友发送闲聊邀请..." : isJapanese ? "友達に雑談の招待を送信中..." : "Sending chat invitations to friends...",
        dateMsg: isChinese ? "正在请求浪漫约会... ❤️" : isJapanese ? "ロマンチックなデートを申請中... ❤️" : "Requesting a romantic date... ❤️",
        quarrelMsg: isChinese ? "准备去找对方理论... 💢" : isJapanese ? "相手と口論する準備をしています... 💢" : "Getting ready to confront them... 💢",
        acceptedDesc: isChinese 
            ? "邀请已被接受！角色们正在动身前往目的地。" 
            : isJapanese 
            ? "招待が受け入れられました！キャラクターたちが目的地に向かっています。" 
            : "The invitation has been accepted! The characters are heading to the venue.",
        rejectedDesc: isChinese 
            ? "对方现在有些忙，或者正在睡觉呢，稍后再试试吧。" 
            : isJapanese 
            ? "相手は今忙しいか、あるいは寝ています。後でもう一度試してください。" 
            : "They are currently busy or sleeping. Let's try again later.",
    };

    const targetNames = targets.map(c => c.name).join(', ');

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
            <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden text-center">
                {/* Header */}
                <div className="bg-slate-100 p-4 border-b-4 border-black font-black text-lg uppercase text-black">
                    {status === 'waiting' && <span className="animate-pulse">⏳ {t.waiting}...</span>}
                    {status === 'accepted' && <span className="text-green-600">✅ {t.accepted}</span>}
                    {status === 'rejected' && <span className="text-red-500">❌ {t.rejected}</span>}
                </div>

                {/* Avatar Comparison animation row */}
                <div className="p-8 bg-indigo-50/20 flex flex-col items-center justify-center space-y-6">
                    <div className="flex items-center justify-center gap-6">
                        {initiator && (
                            <div className="relative">
                                <img 
                                    src={initiator.avatarUrl} 
                                    className="w-16 h-16 rounded-full border-4 border-black object-cover" 
                                    alt={initiator.name}
                                />
                                <div className="absolute -bottom-1 -right-1 bg-white border-2 border-black rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">
                                    📣
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col space-y-1">
                            <span className="font-black text-xl animate-bounce">💬</span>
                            <span className="text-slate-300 font-bold text-sm">▶▶▶</span>
                        </div>

                        <div className="flex gap-[-8px]">
                            {targets.map(c => (
                                <div key={c.id} className="relative first:ml-0 ml-[-12px]">
                                    <img 
                                        src={c.avatarUrl} 
                                        className="w-16 h-16 rounded-full border-4 border-black object-cover bg-white shadow-md" 
                                        alt={c.name}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status descriptions */}
                    <div className="space-y-2">
                        {status === 'waiting' && (
                            <>
                                <p className="font-black text-sm text-indigo-600">
                                    {activityType === 'chat' && t.chatMsg}
                                    {activityType === 'date' && t.dateMsg}
                                    {activityType === 'quarrel' && t.quarrelMsg}
                                </p>
                                <p className="text-xs font-bold text-slate-400">
                                    {isChinese 
                                        ? `等待 ${targetNames} 的回应...` 
                                        : isJapanese 
                                        ? `${targetNames} の返答を待っています...` 
                                        : `Waiting for ${targetNames} to respond...`}
                                </p>
                                <div className="flex justify-center space-x-1.5 pt-2">
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
                                </div>
                            </>
                        )}

                        {status === 'accepted' && (
                            <>
                                <p className="font-black text-sm text-green-600">
                                    {isChinese ? "太棒了！已成行！" : isJapanese ? "素晴らしい！決定しました！" : "Hurray! Let's go!"}
                                </p>
                                <p className="text-xs font-bold text-slate-500">
                                    {t.acceptedDesc}
                                </p>
                            </>
                        )}

                        {status === 'rejected' && (
                            <>
                                <p className="font-black text-sm text-red-600">
                                    {isChinese ? "邀请未成功..." : isJapanese ? "招待が届きませんでした..." : "Request declined..."}
                                </p>
                                <p className="text-xs font-bold text-slate-500">
                                    {t.rejectedDesc}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="p-4 border-t-4 border-black bg-slate-50">
                    <button
                        onClick={onClose}
                        className={`w-full py-2.5 border-2 border-black rounded-xl font-black text-xs shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all uppercase tracking-wider ${
                            status === 'waiting' 
                                ? 'bg-red-50 hover:bg-red-100 text-red-700' 
                                : 'bg-yellow-400 hover:bg-yellow-500 text-black'
                        }`}
                    >
                        {status === 'waiting' ? t.cancel : t.close}
                    </button>
                </div>
            </div>
        </div>
    );
};
