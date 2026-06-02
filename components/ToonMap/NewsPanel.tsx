import React, { useState, useEffect } from 'react';
import { ToonEvent, eventService } from '../../lib/event-service';
import { Contact } from '../../types';
import { FormattedChatMessage } from '../FormattedChatMessage';

interface NewsPanelProps {
    language: string;
    onClose: () => void;
    contacts: Contact[];
}

export const NewsPanel: React.FC<NewsPanelProps> = ({ language, onClose, contacts }) => {
    const [events, setEvents] = useState<ToonEvent[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        const loadEvents = async () => {
            const data = await eventService.getEvents(40);
            // Filter to only show events that have successfully generated news content
            setEvents(data.filter(e => e.title && e.content));
        };
        loadEvents();
    }, []);

    const totalPages = events.length;
    const currentEvent = events[currentPage];
    const isChinese = language === '简体中文';

    const getCharacterName = (id: string) => {
        const char = contacts.find(c => c.id === id);
        return char ? char.name : id;
    };

    const renderNewsTemplate = (event: ToonEvent) => {
        const primaryChar = contacts.find(c => c.id === event.characters[0]);
        const secondaryChar = contacts.find(c => c.id === event.characters[1]);

        switch (event.type) {
            case 'OPENING':
                return (
                    <div className="flex flex-col gap-6 animate-fade-in relative z-10">
                        {/* Giant Vibrant Opening Billboard */}
                        <div className="bg-gradient-to-br from-yellow-400 to-amber-500 border-6 border-black p-6 shadow-[8px_8px_0px_#000] rotate-[-1.5deg] relative overflow-hidden group rounded-md">
                            {/* Comic rays overlay */}
                            <div className="absolute inset-0 opacity-20 bg-[repeating-conic-gradient(from_0deg,#000_0deg_15deg,transparent_15deg_30deg)] pointer-events-none" />
                            <div className="absolute -right-4 -bottom-6 text-9xl opacity-20 rotate-12 select-none group-hover:scale-110 transition-transform">🏢</div>
                            
                            {/* Starburst badge */}
                            <div className="absolute top-2 right-2 bg-red-500 text-white font-bubble text-base py-1.5 px-4 uppercase border-4 border-black rotate-12 shadow-[4px_4px_0px_#000] animate-bounce">
                                {isChinese ? "盛大开张！" : "GRAND OPENING!"}
                            </div>

                            <h2 className="text-4xl md:text-5xl font-comic text-black text-stroke-thin leading-none uppercase tracking-tight">
                                {isChinese ? `🎉 祝贺 ${primaryChar?.name || '某人'}！` : `🎉 CONGRATS ${primaryChar?.name || 'SOMEONE'}!`}
                            </h2>
                            <p className="text-2xl font-comic mt-3 text-indigo-900 uppercase tracking-wide text-stroke-thin">
                                {isChinese ? `${event.metadata.buildingName} 正式开业啦！` : `${event.metadata.buildingName} IS NOW OPEN!`}
                            </p>
                        </div>
                        
                        {/* Side-by-side Manager Feature (Prominent) */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 bg-white border-6 border-black p-6 shadow-[6px_6px_0px_#000] rotate-[0.5deg]">
                            <div className="w-36 h-36 border-6 border-black rounded-2xl overflow-hidden bg-orange-300 shrink-0 shadow-[4px_4px_0px_#000] relative group">
                                <img src={primaryChar?.avatarUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt="" />
                                <div className="absolute bottom-0 inset-x-0 bg-black text-white text-xs font-comic text-center py-1 border-t-4 border-black">
                                    {isChinese ? "主理人" : "MANAGER"}
                                </div>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-2xl font-comic text-red-500 mb-2 uppercase text-stroke-thin">
                                    {event.title}
                                </h3>
                                <div className="text-lg font-body leading-relaxed text-slate-800">
                                    <FormattedChatMessage text={event.content || ''} />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'QUARREL':
                return (
                    <div className="flex flex-col gap-6 animate-fade-in relative z-10">
                        {/* Red Headline Banner */}
                        <div className="bg-red-500 border-6 border-black p-5 shadow-[8px_8px_0px_#000] rotate-[1deg] text-white rounded-md text-center">
                            <h2 className="text-4xl md:text-5xl font-comic uppercase tracking-tight text-stroke-thin leading-none">
                                {isChinese ? "😱 震惊！火药味十足的口角爆发！" : "😱 SHOCKING WAR OF WORDS!"}
                            </h2>
                        </div>

                        {/* Split VS Screen (Prominent Graphics) */}
                        <div className="relative bg-yellow-100 border-6 border-black p-8 flex flex-col md:flex-row items-center justify-between min-h-[240px] overflow-hidden shadow-[6px_6px_0px_#000] rounded-md">
                            {/* Comic split divider line */}
                            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-16 bg-red-500 border-l-6 border-r-6 border-black -translate-x-1/2 skew-x-[-15deg] z-10 shadow-[4px_0px_10px_rgba(0,0,0,0.2)]" />
                            
                            {/* Left Side */}
                            <div className="flex flex-col items-center gap-3 z-20 w-full md:w-[40%]">
                                <div className="w-28 h-28 border-6 border-black rounded-full overflow-hidden bg-sky-300 shadow-[6px_6px_0px_#000] hover:scale-105 transition-transform">
                                    <img src={primaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className="font-bubble text-base bg-black text-white px-4 py-1 border-4 border-black rotate-[-3deg] shadow-[2px_2px_0px_#000] tracking-wide">
                                    {primaryChar?.name}
                                </span>
                                <div className="relative bg-white border-4 border-black p-3 rounded-2xl max-w-[200px] shadow-[4px_4px_0px_#000] text-sm font-bubble text-center mt-2 animate-bounce-slow text-stroke-thin">
                                    🗯️ {isChinese ? "大笨蛋！你在胡说八道！" : "YOU PIXEL-HEADED ANNOYANCE!"} 🤬
                                </div>
                            </div>

                            {/* Middle VS */}
                            <div className="flex flex-col items-center gap-1 my-4 md:my-0 z-20 shrink-0">
                                <span className="text-7xl font-comic text-yellow-400 text-stroke-thick rotate-[-15deg] animate-pulse">VS</span>
                                <div className="flex gap-2 text-3xl animate-bounce">💢 💥 🗯️</div>
                            </div>

                            {/* Right Side */}
                            <div className="flex flex-col items-center gap-3 z-20 w-full md:w-[40%]">
                                <div className="w-28 h-28 border-6 border-black rounded-full overflow-hidden bg-orange-300 shadow-[6px_6px_0px_#000] hover:scale-105 transition-transform">
                                    <img src={secondaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className="font-bubble text-base bg-black text-white px-4 py-1 border-4 border-black rotate-[3deg] shadow-[2px_2px_0px_#000] tracking-wide">
                                    {secondaryChar?.name}
                                </span>
                                <div className="relative bg-white border-4 border-black p-3 rounded-2xl max-w-[200px] shadow-[4px_4px_0px_#000] text-sm font-bubble text-center mt-2 animate-bounce-slow text-stroke-thin" style={{ animationDelay: '0.4s' }}>
                                    🤬 {isChinese ? "明明是你脑子进水了！#@%!" : "YOUR CIRCUITS ARE LOOSE! #@*&!"} ⚡
                                </div>
                            </div>
                        </div>

                        {/* Article Text */}
                        <div className="p-6 border-6 border-black bg-white shadow-[6px_6px_0px_#000] rotate-[-0.5deg]">
                            <h3 className="text-2xl font-comic text-indigo-600 mb-2 uppercase text-stroke-thin">
                                {event.title}
                            </h3>
                            <div className="text-lg font-body leading-relaxed text-slate-800">
                                <FormattedChatMessage text={event.content || ''} />
                            </div>
                        </div>
                    </div>
                );

            case 'FIGHT':
                return (
                    <div className="flex flex-col gap-6 animate-fade-in relative z-10">
                        {/* Explosive Headline */}
                        <div className="bg-black border-6 border-black p-5 shadow-[8px_8px_0px_#000] text-yellow-400 rotate-[-1.5deg] relative overflow-hidden group rounded-md">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_2px,transparent_0)] bg-[size:10px_10px]" />
                            <h2 className="text-5xl md:text-6xl font-comic text-center uppercase tracking-tighter text-stroke-thin text-yellow-400 animate-pulse">
                                {isChinese ? "💥 轰！大乱斗爆发！" : "💥 KABOOM! IT'S A BRAWL!"}
                            </h2>
                        </div>

                        {/* Large Animated Brawl Cloud (Cartoon Colors) */}
                        <div className="relative bg-white border-6 border-black p-8 flex items-center justify-center min-h-[260px] overflow-hidden rounded-xl shadow-[6px_6px_0px_#000]">
                            
                            {/* Brawl Dust Clouds (Vibrant blue/gray/yellow gradients) */}
                            <div className="absolute w-80 h-52 bg-slate-200/90 border-6 border-black rounded-full animate-brawl-dust shadow-lg" />
                            <div className="absolute w-64 h-40 bg-sky-200/80 border-6 border-black rounded-full animate-brawl-dust-delayed shadow-lg" />
                            <div className="absolute w-52 h-52 bg-yellow-200/90 border-6 border-black rounded-full animate-brawl-dust shadow-lg" style={{ animationDuration: '3.5s' }} />

                            {/* Flying Cartoon Impacts */}
                            <div className="absolute top-10 left-12 text-4xl font-comic text-red-600 rotate-[-25deg] select-none animate-bounce text-stroke-thin">POW!</div>
                            <div className="absolute bottom-10 right-12 text-4xl font-comic text-yellow-500 rotate-[20deg] select-none animate-bounce text-stroke-thin" style={{ animationDelay: '0.4s' }}>BAM!</div>
                            <div className="absolute top-6 right-20 text-3xl font-comic text-blue-600 rotate-[15deg] select-none animate-pulse text-stroke-thin">KAPOW!</div>

                            {/* Orbiting particles */}
                            <div className="absolute text-4xl animate-orbit-1 select-none pointer-events-none">⭐</div>
                            <div className="absolute text-5xl animate-orbit-2 select-none pointer-events-none">🥊</div>
                            <div className="absolute text-4xl animate-orbit-3 select-none pointer-events-none">💨</div>
                            <div className="absolute text-5xl animate-orbit-4 select-none pointer-events-none">👟</div>

                            {/* Popping out avatars */}
                            <div className="flex gap-16 items-center z-10">
                                <div className="w-24 h-24 border-6 border-black rounded-2xl rotate-[-20deg] overflow-hidden bg-rose-300 shadow-2xl animate-pop-out-fist-left">
                                    <img src={primaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="text-5xl text-red-600 font-comic animate-scale-fight text-stroke-thin">💥🥊💥</div>
                                <div className="w-24 h-24 border-6 border-black rounded-2xl rotate-[20deg] overflow-hidden bg-amber-300 shadow-2xl animate-pop-out-fist-right">
                                    <img src={secondaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                            </div>
                        </div>

                        {/* Medical Report / Aftermath Details */}
                        <div className="p-6 bg-red-50 border-6 border-black shadow-[6px_6px_0px_#000] rotate-[0.5deg]">
                            <div className="flex items-center gap-3 border-b-4 border-dashed border-red-300 pb-2 mb-3">
                                <span className="text-4xl">🏥</span>
                                <h4 className="font-comic text-2xl uppercase text-red-600 tracking-wider text-stroke-thin">
                                    {isChinese ? "🏥 伤情与救治速报" : "🏥 MEDICAL DISPATCH"}
                                </h4>
                            </div>
                            <h3 className="text-2xl font-comic text-black mb-1">
                                {event.title}
                            </h3>
                            <div className="text-lg font-body leading-relaxed text-slate-800">
                                <FormattedChatMessage text={event.content || ''} />
                            </div>
                        </div>
                    </div>
                );

            case 'PRODUCTION':
                return (
                    <div className="flex flex-col gap-6 animate-fade-in relative z-10">
                        {/* Gallery Billboard Header */}
                        <div className="bg-gradient-to-br from-green-400 to-emerald-500 border-6 border-black p-5 shadow-[8px_8px_0px_#000] rotate-[-1deg] rounded-md">
                            <h2 className="text-3xl md:text-4xl font-comic uppercase tracking-tight text-stroke-thin text-black leading-none">
                                {isChinese ? `🎨 本地创作快报：新成果出炉！` : `🎨 NEW WORK COMPLETED!`}
                            </h2>
                        </div>

                        {/* Showcase Frame */}
                        <div className="bg-white border-6 border-[#4a2e1d] p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] relative rotate-[1deg] flex flex-col items-center">
                            {/* Gold gallery spotlight beam */}
                            <div className="absolute top-0 w-56 h-16 bg-gradient-to-b from-yellow-300/30 to-transparent pointer-events-none rounded-t-full" />
                            
                            {/* Author avatar */}
                            <div className="absolute -top-6 -left-6 w-16 h-16 border-6 border-black rounded-full overflow-hidden shadow-xl rotate-[-15deg] bg-amber-200 hover:rotate-0 transition-transform">
                                <img src={primaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                            </div>

                            <div className="w-full px-4 py-4 bg-[#faf9f6] border-4 border-dashed border-amber-800 rounded-lg mt-2">
                                <h3 className="text-2xl font-comic text-amber-900 mb-2 border-b-2 border-dashed border-amber-900/20 pb-1 text-stroke-thin">
                                    {event.title}
                                </h3>
                                <div className="text-lg font-body text-slate-800 leading-relaxed italic">
                                    <FormattedChatMessage text={event.content || ''} />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'COMMENT':
                return (
                    <div className="flex flex-col gap-6 animate-fade-in relative z-10">
                        {/* Chat Feed Header */}
                        <div className="bg-purple-400 border-6 border-black p-4 shadow-[8px_8px_0px_#000] rotate-[1.5deg] rounded-md">
                            <h2 className="text-3xl font-comic uppercase tracking-tight text-stroke-thin text-black leading-none">
                                {isChinese ? `📣 街头八卦与神回复` : `📣 CITIZENS COMMENT ON FEED`}
                            </h2>
                        </div>

                        {/* Large Highlight Sticky Note */}
                        <div className="relative bg-yellow-200 border-6 border-black p-8 shadow-[8px_8px_0px_#000] rotate-[-1deg] w-full">
                            {/* Giant red pushpin */}
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-5xl drop-shadow-[4px_6px_3px_rgba(0,0,0,0.3)] animate-pulse">📌</div>
                            
                            <div className="flex items-center gap-4 border-b-4 border-black/10 pb-3 mb-4">
                                <div className="w-16 h-16 border-4 border-black rounded-full overflow-hidden bg-sky-200 shrink-0">
                                    <img src={primaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div>
                                    <h4 className="font-comic text-xl text-black leading-none text-stroke-thin">{primaryChar?.name}</h4>
                                    <span className="text-xs font-comic text-slate-700 uppercase">
                                        {isChinese ? `发表于 ${event.metadata.buildingName || '街头'}` : `POSTED AT ${event.metadata.buildingName || 'Street'}`}
                                    </span>
                                </div>
                            </div>

                            <div className="text-xl font-body leading-relaxed text-slate-800 italic">
                                <FormattedChatMessage text={event.content || ''} />
                            </div>
                        </div>
                    </div>
                );

            case 'HOSPITALIZED':
                return (
                    <div className="flex flex-col gap-6 animate-fade-in relative z-10">
                        {/* Red Emergency Header */}
                        <div className="bg-red-600 border-6 border-black p-5 shadow-[8px_8px_0px_#000] rotate-[-1deg] text-white rounded-md">
                            <h2 className="text-3xl md:text-4xl font-comic uppercase tracking-tight text-stroke-thin text-center text-yellow-300">
                                {isChinese ? `🚨 医院紧急健康速递` : `🚨 CRITICAL HEALTH DISPATCH`}
                            </h2>
                        </div>

                        <div className="bg-white border-6 border-black p-6 shadow-[6px_6px_0px_#000] rotate-[1deg] flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative shrink-0">
                                <div className="w-28 h-28 border-6 border-black rounded-2xl overflow-hidden bg-red-100 shadow-[4px_4px_0px_#000]">
                                    <img src={primaryChar?.avatarUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="absolute -top-4 -right-4 text-4xl animate-bounce">🩹</div>
                            </div>
                            
                            <div className="flex-1">
                                <span className="inline-block bg-red-500 text-white border-3 border-black rounded px-3 py-1 font-comic text-xs uppercase mb-2 shadow-[2px_2px_0px_#000]">
                                    {isChinese ? "伤员健康报告" : "DIAGNOSIS"}
                                </span>
                                <h3 className="text-2xl font-comic text-black mb-1">
                                    {event.title}
                                </h3>
                                <div className="text-lg font-body leading-relaxed text-slate-800">
                                    <FormattedChatMessage text={event.content || ''} />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return (
                    <div className="flex flex-col gap-4 animate-fade-in relative z-10">
                        <div className="bg-white border-6 border-black px-4 py-2 self-start text-sm font-comic uppercase tracking-wider rotate-[-1.5deg] shadow-[4px_4px_0px_#000] text-stroke-thin text-indigo-600">
                            {isChinese ? "⚡ 卡通头条快讯" : "⚡ TOON BRIEF"}
                        </div>
                        <h2 className="text-4xl font-comic text-black leading-none uppercase tracking-tight text-stroke-thin text-yellow-500">
                            {event.title}
                        </h2>
                        <div className="p-6 border-6 border-black bg-white shadow-[6px_6px_0px_#000] text-lg font-body text-slate-900 leading-relaxed">
                            <FormattedChatMessage text={event.content || ''} />
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-8 animate-in zoom-in duration-300">
            {/* Layers for stacked book-like/pad-like newspaper stack look (Offsets strictly on Right and Bottom) */}
            <div className="relative w-full max-w-[720px] h-[88vh] pr-[50px] pb-[50px]">
                
                {/* Stacked Sheet 5 (Bottom-most Page - Darkest Shade) */}
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-[#d9cfa9] border-6 border-black rounded-sm z-0 shadow-[10px_10px_0px_#000]" />
                
                {/* Stacked Sheet 4 */}
                <div className="absolute top-0 left-0 right-[10px] bottom-[10px] bg-[#e0d6b6] border-6 border-black rounded-sm z-0 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]" />
                
                {/* Stacked Sheet 3 */}
                <div className="absolute top-0 left-0 right-[20px] bottom-[20px] bg-[#e7dec2] border-6 border-black rounded-sm z-0 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]" />
                
                {/* Stacked Sheet 2 */}
                <div className="absolute top-0 left-0 right-[30px] bottom-[30px] bg-[#efe7cf] border-6 border-black rounded-sm z-0 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]" />
                
                {/* Stacked Sheet 1 (Lightest Shade) */}
                <div className="absolute top-0 left-0 right-[40px] bottom-[40px] bg-[#f6f0db] border-6 border-black rounded-sm z-0 shadow-[4px_4px_0px_rgba(0,0,0,0.1)]" />

                {/* Main Interactive Top Page (Flush on Left/Top, Offset margins on Right/Bottom) */}
                <div className="absolute top-0 left-0 right-[50px] bottom-[50px] bg-[#fbf9f0] border-6 border-black flex flex-col overflow-hidden rounded-sm z-10">
                    
                    {/* Paper Halftone Dot Print Grid */}
                    <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[radial-gradient(circle,#000_1.5px,transparent_0)] bg-[size:6px_6px] z-0" />

                    {/* Coffee Stain overlay */}
                    <div className="absolute -top-12 -left-12 w-64 h-64 border-[18px] border-amber-900/5 rounded-full pointer-events-none z-20 rotate-12 blur-[1px]">
                        <div className="w-full h-full rounded-full border-4 border-amber-900/5 m-2" />
                    </div>

                    {/* Header Section (Masthead) */}
                    <div className="w-full border-b-8 border-black bg-white p-4 flex flex-col items-center relative z-10 pt-5">
                        
                        <div className="w-full flex justify-between items-center text-[10px] md:text-xs font-black uppercase tracking-wider border-b-4 border-black pb-1.5 mb-2 font-comic text-black">
                            <div className="flex gap-4">
                                <span>VOL. {999 + currentPage}</span>
                                <span>NO. {12345 + currentPage}</span>
                            </div>
                            <div className="bg-yellow-400 border-3 border-black px-3 py-0.5 rounded rotate-2 shadow-[2px_2px_0px_#000] font-comic text-xs uppercase animate-pulse text-stroke-thin">
                                {isChinese ? "大饱眼福！" : "PRICE: FREE!"}
                            </div>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>

                        <div className="relative py-1 flex items-center gap-4">
                            <span className="text-4xl md:text-5xl select-none animate-bounce-slow">🗞️</span>
                            <h1 className="text-6xl md:text-8xl font-comic text-yellow-400 tracking-tighter uppercase italic leading-none text-stroke-thick shadow-comic drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none">
                                {isChinese ? "卡通大报" : "THE TOON TIMES"}
                            </h1>
                            <span className="text-4xl md:text-5xl select-none animate-bounce-slow" style={{ animationDelay: '0.4s' }}>🗞️</span>
                        </div>

                        {/* Slogans Ticker Bar */}
                        <div className="w-full border-t-4 border-b-2 border-black mt-2 py-1 flex justify-around items-center text-[10px] md:text-xs font-bold italic font-comic text-slate-800 bg-amber-50/50 select-none">
                            <span>★ EXTRA! EXTRA! ★</span>
                            <span>"ALL THE NEWS THAT'S FUN TO PRINT"</span>
                            <span>★ EST. 1928 ★</span>
                        </div>
                    </div>

                    {/* Content Grid (Asymmetrical Layout: Left is Main story, Right is Sidebar Widgets) */}
                    <div className="flex-1 flex overflow-hidden relative z-10 bg-transparent">
                        {events.length > 0 ? (
                            <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-y-auto custom-scrollbar">
                                
                                {/* Left Side: Major Story Column (65% width) */}
                                <div className="flex-[1.8] flex flex-col gap-4 border-b-4 lg:border-b-0 lg:border-r-4 border-black pb-6 lg:pb-0 lg:pr-6 border-dashed">
                                    {renderNewsTemplate(currentEvent)}
                                </div>

                                {/* Right Side: Small Cartoon Widgets Stack (35% width) */}
                                <div className="flex-1 flex flex-col gap-6 lg:max-w-[280px] shrink-0">
                                    
                                    {/* WEATHER BOX (Vibrant Sky Blue) */}
                                    <div className="border-6 border-black p-4 bg-[#38bdf8] shadow-[6px_6px_0px_#000] rotate-[1.5deg] hover:rotate-0 transition-transform duration-300 text-white">
                                        <h3 className="font-comic text-base border-b-4 border-black pb-1 mb-2 uppercase italic text-stroke-thin text-black">
                                            {isChinese ? "🌤️ 今日气候" : "🌤️ WEATHER"}
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            <span className="text-4xl animate-bounce">⛈️</span>
                                            <div className="text-[11px] font-comic font-black leading-tight text-black text-stroke-thin">
                                                <div>{isChinese ? "大钢琴雨预警" : "SCATTERED PIANO SHOWERS"}</div>
                                                <div className="mt-1 text-red-600 bg-white border-2 border-black px-1 py-0.5 rounded text-[9px] text-center inline-block">{isChinese ? "🚨 重型头盔提醒" : "🚨 HELMETS ADVISED"}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ANECDOTES / FUN FACTS (Vibrant Lime Green) */}
                                    <div className="border-6 border-black p-4 bg-[#4ade80] shadow-[6px_6px_0px_#000] rotate-[-1.5deg] hover:rotate-0 transition-transform duration-300 text-black">
                                        <h3 className="font-comic text-base border-b-4 border-black pb-1 mb-2 uppercase italic text-stroke-thin">
                                            {isChinese ? "🗣️ 趣闻轶事" : "🗣️ TOON TALES"}
                                        </h3>
                                        <p className="font-body text-xs leading-normal">
                                            {isChinese 
                                                ? "一位不愿意透露姓名的仓鼠表示：‘当时天空突然掉下来一个巨大的奶酪，把我们的大卡车砸出了个大坑！简直太滑稽了！’"
                                                : "A local hamster reported: 'A giant cheese wheel rolled down the main square and flattened my unicycle! It was hilarious!'"}
                                        </p>
                                    </div>

                                    {/* VINTAGE ADVERTISEMENT (Vibrant Neon Orange) */}
                                    <div className="border-6 border-black p-4 bg-[#fb923c] shadow-[6px_6px_0px_#000] rotate-[1deg] hover:scale-102 transition-all text-black flex flex-col justify-center min-h-[110px]">
                                        <span className="text-[8px] font-comic font-bold text-black/60 block mb-1">CLASSIFIED ADS</span>
                                        <div className="font-comic text-2xl text-red-600 text-stroke-thin tracking-tight">💣 ACME BOMBS!</div>
                                        <div className="text-[10px] font-body mt-1 leading-tight text-slate-900 font-bold">
                                            {isChinese ? "特选重力大铁砧与卡通炸弹。现正七折抢购！" : "Guaranteed to trigger comical collapses. 30% Off Today!"}
                                        </div>
                                    </div>

                                    {/* STOCK INDEX TICKER (Vibrant Yellow) */}
                                    <div className="border-6 border-black p-4 bg-[#facc15] shadow-[6px_6px_0px_#000] rotate-[-0.5deg]">
                                        <h3 className="font-comic text-xs border-b-4 border-black pb-1 mb-2 uppercase text-stroke-thin text-black">
                                            {isChinese ? "📈 卡通股市行情" : "📈 TOON MARKET"}
                                        </h3>
                                        <div className="font-comic text-xs text-black leading-tight text-stroke-thin">
                                            <div className="flex justify-between"><span>CARROTS:</span> <span className="text-green-600">▲ 420%</span></div>
                                            <div className="flex justify-between mt-1"><span>BANANAS:</span> <span className="text-green-600">▲ 180%</span></div>
                                            <div className="flex justify-between mt-1"><span>ANVILS:</span> <span className="text-red-600">▼ 99%</span></div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center grayscale opacity-30 rotate-[-2deg] gap-6 p-12 text-center select-none">
                                <span className="text-9xl mb-4 animate-bounce">🗞️</span>
                                <div className="flex flex-col gap-2">
                                    <span className="font-comic text-3xl uppercase tracking-tight text-stroke-thin">
                                        {isChinese ? "暂无新闻报道" : "NO NEWS REPORTED YET"}
                                    </span>
                                    <p className="text-xs font-bold max-w-sm mx-auto opacity-75">
                                        {isChinese ? "建筑物工作产出、AI 冲突或盛大开业时，新闻便会印刷于此。快去让市民们活跃起来吧！" : "News will report automatically when buildings produce items, AI interact or clash, or structures open."}
                                    </p>
                                </div>
                                
                                {/* Debug Trigger Button */}
                                <button
                                    onClick={async () => {
                                        await eventService.addEvent({
                                            type: 'OPENING',
                                            characters: ['system'],
                                            location: 'town_square',
                                            metadata: {
                                                buildingName: isChinese ? '疯狂蹦床广场' : 'Crazy Trampoline Square',
                                                buildingType: 'park'
                                            }
                                        });
                                        alert(isChinese ? "测试事件已触发，AI 开始印报排版中..." : "Test event triggered, AI is printing the news...");
                                        onClose(); // Close to allow refresh on re-open
                                    }}
                                    className="mt-4 bg-[#facc15] text-[#1a1a1a] border-4 border-black px-6 py-2.5 font-comic text-sm uppercase shadow-[4px_4px_0px_#000] hover:scale-110 active:translate-y-1 active:shadow-[2px_2px_0px_#000] transition-all text-stroke-thin"
                                >
                                    ⚡ {isChinese ? "强制生成一条测试新闻" : "FORCE GENERATE TEST NEWS"}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Navigation Footer */}
                    <div className="w-full bg-black text-white p-4 flex justify-between items-center relative z-20 border-t-8 border-black">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                            disabled={currentPage === 0}
                            className="bg-white text-black border-4 border-black px-5 py-2 rounded font-comic text-xs hover:bg-yellow-400 disabled:opacity-30 disabled:hover:bg-white active:translate-y-1 transition-all shadow-[4px_4px_0px_#fff] text-stroke-thin"
                        >
                            ← {isChinese ? "前一期" : "BACK"}
                        </button>
                        
                        <div className="flex flex-col items-center">
                            <div className="text-[9px] font-comic tracking-widest text-yellow-400 uppercase">ARCHIVE VIEWER</div>
                            <div className="flex gap-1.5 mt-0.5">
                                {Array.from({ length: Math.min(8, totalPages) }).map((_, i) => (
                                    <div key={i} className={`w-2.5 h-2.5 border-2 border-white transition-all duration-300 ${currentPage === i ? 'bg-yellow-400 scale-110 rotate-45' : 'bg-transparent'}`} />
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={currentPage >= totalPages - 1}
                            className="bg-white text-black border-4 border-black px-5 py-2 rounded font-comic text-xs hover:bg-yellow-400 disabled:opacity-30 disabled:hover:bg-white active:translate-y-1 transition-all shadow-[4px_4px_0px_#fff] text-stroke-thin"
                        >
                            {isChinese ? "下一期" : "NEXT"} →
                        </button>
                    </div>

                    {/* Red Close Button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-red-500 text-white border-4 border-black rounded-full shadow-[4px_4px_0px_#000] hover:scale-110 active:scale-95 transition-all font-comic text-2xl font-bold"
                    >
                        ✕
                    </button>
                </div>
            </div>
            
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Luckiest+Guy&family=Comic+Neue:wght=700&family=Special+Elite&display=swap');

                .font-gothic {
                    font-family: 'Playfair Display', Georgia, serif;
                }
                .font-newspaper {
                    font-family: 'Playfair Display', Georgia, serif;
                }
                .font-comic {
                    font-family: 'Bangers', sans-serif;
                }
                .font-bubble {
                    font-family: 'Luckiest Guy', cursive;
                }
                .font-body {
                    font-family: 'Comic Neue', sans-serif;
                    font-weight: bold;
                }
                .font-typewriter {
                    font-family: 'Special Elite', monospace;
                }
                .text-stroke-thin {
                    -webkit-text-stroke: 1.5px black;
                }
                .text-stroke-thick {
                    -webkit-text-stroke: 3px black;
                }
                .shadow-comic {
                    text-shadow: 4px 4px 0px black;
                }

                /* Custom scrollbar matching paper */
                .custom-scrollbar::-webkit-scrollbar {
                    width: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                    border-left: 4px solid black;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: black;
                    border: 2px solid white;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #222;
                }

                /* Custom Keyframe Animations */
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }

                @keyframes brawl-dust {
                    0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
                    33% { transform: scale(1.06) translate(-8px, 4px) rotate(2deg); }
                    66% { transform: scale(0.96) translate(6px, -6px) rotate(-2deg); }
                }
                @keyframes brawl-dust-delayed {
                    0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
                    33% { transform: scale(0.94) translate(6px, -4px) rotate(-2deg); }
                    66% { transform: scale(1.04) translate(-4px, 6px) rotate(2deg); }
                }
                .animate-brawl-dust {
                    animation: brawl-dust 3.5s infinite ease-in-out;
                }
                .animate-brawl-dust-delayed {
                    animation: brawl-dust-delayed 3.7s infinite ease-in-out;
                    animation-delay: 0.4s;
                }

                @keyframes orbit-1 {
                    0% { transform: rotate(0deg) translateX(100px) rotate(0deg) scale(0.5); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: rotate(360deg) translateX(100px) rotate(-360deg) scale(1.2); opacity: 0; }
                }
                @keyframes orbit-2 {
                    0% { transform: rotate(90deg) translateX(90px) rotate(-90deg) scale(0.6); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: rotate(450deg) translateX(90px) rotate(-450deg) scale(1.3); opacity: 0; }
                }
                @keyframes orbit-3 {
                    0% { transform: rotate(180deg) translateX(110px) rotate(-180deg) scale(0.5); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: rotate(540deg) translateX(110px) rotate(-540deg) scale(1.2); opacity: 0; }
                }
                @keyframes orbit-4 {
                    0% { transform: rotate(270deg) translateX(85px) rotate(-270deg) scale(0.7); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: rotate(630deg) translateX(85px) rotate(-630deg) scale(1.1); opacity: 0; }
                }
                .animate-orbit-1 { animation: orbit-1 2.5s infinite linear; }
                .animate-orbit-2 { animation: orbit-2 2.8s infinite linear; animation-delay: 0.5s; }
                .animate-orbit-3 { animation: orbit-3 2.2s infinite linear; animation-delay: 1s; }
                .animate-orbit-4 { animation: orbit-4 2.6s infinite linear; animation-delay: 1.5s; }

                @keyframes pop-out-fist-left {
                    0%, 100% { transform: translate(-25px, 8px) rotate(-25deg) scale(0.85); }
                    50% { transform: translate(8px, -4px) rotate(-10deg) scale(1.05); }
                }
                @keyframes pop-out-fist-right {
                    0%, 100% { transform: translate(25px, -8px) rotate(25deg) scale(0.85); }
                    50% { transform: translate(-8px, 4px) rotate(10deg) scale(1.05); }
                }
                .animate-pop-out-fist-left { animation: pop-out-fist-left 2s infinite ease-in-out; }
                .animate-pop-out-fist-right { animation: pop-out-fist-right 2.1s infinite ease-in-out; animation-delay: 0.2s; }

                @keyframes scale-fight {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2) rotate(-5deg); }
                }
                .animate-scale-fight {
                    animation: scale-fight 1s infinite ease-in-out;
                }

                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
