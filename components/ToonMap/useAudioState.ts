import { useState, useEffect, useRef, useCallback } from 'react';
import { ChiptuneAudioSystem, saveTrackBlob, deleteTrackBlob } from './MapAudioSynth';
import { MapTheme } from './types';

interface CustomTrack {
    id: string;
    name: string;
    type: "file" | "link";
    url?: string;
}

export function useAudioState() {
    const synthRef = useRef<ChiptuneAudioSystem | null>(null);

    const [bgmMuted, setBgmMuted] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("toon_map_bgm_muted");
            return saved ? saved === "true" : true;
        }
        return true;
    });

    const [bgmVolume, setBgmVolumeState] = useState<number>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("toon_map_bgm_volume");
            return saved ? parseFloat(saved) : 0.3;
        }
        return 0.3;
    });

    const [sfxMuted, setSfxMuted] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("toon_map_sfx_muted");
            return saved ? saved === "true" : true;
        }
        return true;
    });

    const [showAudioDropdown, setShowAudioDropdown] = useState(false);
    const audioDropdownRef = useRef<HTMLDivElement>(null);

    // Custom BGM States
    const [useCustomBGM, setUseCustomBGM] = useState<boolean>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("toon_map_use_custom_bgm");
            return saved === "true";
        }
        return false;
    });

    const [customPlaylist, setCustomPlaylist] = useState<CustomTrack[]>(() => {
        if (typeof window !== "undefined") {
            try {
                const saved = localStorage.getItem("toon_map_custom_playlist");
                return saved ? JSON.parse(saved) : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    });

    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isCustomAudioPanelOpen, setIsCustomAudioPanelOpen] = useState(false);

    const [mapTheme, setMapTheme] = useState<MapTheme>(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("toon_map_theme") as MapTheme) || "default";
        }
        return "default";
    });

    // Close audio dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (audioDropdownRef.current && !audioDropdownRef.current.contains(event.target as Node)) {
                setShowAudioDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Save map theme
    useEffect(() => {
        localStorage.setItem("toon_map_theme", mapTheme);
    }, [mapTheme]);

    // Save custom playlist configurations
    useEffect(() => {
        localStorage.setItem("toon_map_use_custom_bgm", String(useCustomBGM));
    }, [useCustomBGM]);

    useEffect(() => {
        localStorage.setItem("toon_map_custom_playlist", JSON.stringify(customPlaylist));
    }, [customPlaylist]);

    // Audio system lifecycles
    useEffect(() => {
        const system = new ChiptuneAudioSystem();
        synthRef.current = system;
        system.setOnTrackChange((idx) => {
            setCurrentTrackIndex(idx);
        });
        system.setBgmVolume(bgmVolume);
        system.setBgmMute(bgmMuted);
        system.setSfxMute(sfxMuted);
        system.setTheme(mapTheme);
        system.setUseCustomBGM(useCustomBGM, customPlaylist);
        
        return () => {
            system.cleanup();
        };
    }, []);

    useEffect(() => {
        if (synthRef.current) {
            synthRef.current.setTheme(mapTheme);
        }
    }, [mapTheme]);

    useEffect(() => {
        if (synthRef.current) {
            synthRef.current.setUseCustomBGM(useCustomBGM, customPlaylist);
        }
    }, [useCustomBGM, customPlaylist]);

    const toggleBgmMuted = useCallback(() => {
        const nextMuted = !bgmMuted;
        setBgmMuted(nextMuted);
        localStorage.setItem("toon_map_bgm_muted", String(nextMuted));
        if (synthRef.current) {
            synthRef.current.setBgmMute(nextMuted);
        }
    }, [bgmMuted]);

    const setBgmVolume = useCallback((volume: number) => {
        setBgmVolumeState(volume);
        localStorage.setItem("toon_map_bgm_volume", String(volume));
        if (synthRef.current) {
            synthRef.current.setBgmVolume(volume);
        }
    }, []);

    const toggleSfxMuted = useCallback(() => {
        const nextMuted = !sfxMuted;
        setSfxMuted(nextMuted);
        localStorage.setItem("toon_map_sfx_muted", String(nextMuted));
        if (synthRef.current) {
            synthRef.current.setSfxMute(nextMuted);
        }
    }, [sfxMuted]);

    const handleSelectTrack = useCallback((index: number) => {
        if (synthRef.current) {
            synthRef.current.selectCustomTrack(index);
        }
    }, []);

    const handleNextTrack = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.playNextCustomTrack();
        }
    }, []);

    const handleAddLink = useCallback((url: string, name: string) => {
        if (!url.trim()) return;
        const newTrack: CustomTrack = {
            id: `link_track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: name.trim() || url.split("/").pop() || "External Link",
            type: "link",
            url: url.trim()
        };
        const newPlaylist = [...customPlaylist, newTrack];
        setCustomPlaylist(newPlaylist);
        if (customPlaylist.length === 0 && useCustomBGM && synthRef.current) {
            synthRef.current.setUseCustomBGM(useCustomBGM, newPlaylist);
            synthRef.current.selectCustomTrack(0);
        }
    }, [customPlaylist, useCustomBGM]);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        const newTracks: CustomTrack[] = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const trackId = `local_track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            try {
                await saveTrackBlob(trackId, file);
                newTracks.push({
                    id: trackId,
                    name: file.name,
                    type: "file"
                });
            } catch (e) {
                console.error("Failed to save local track to DB:", e);
            }
        }
        if (newTracks.length > 0) {
            const newPlaylist = [...customPlaylist, ...newTracks];
            setCustomPlaylist(newPlaylist);
            if (customPlaylist.length === 0 && useCustomBGM && synthRef.current) {
                synthRef.current.setUseCustomBGM(useCustomBGM, newPlaylist);
                synthRef.current.selectCustomTrack(0);
            }
        }
    }, [customPlaylist, useCustomBGM]);

    const handleDeleteTrack = useCallback(async (id: string, index: number) => {
        const track = customPlaylist[index];
        if (track.type === "file") {
            try {
                await deleteTrackBlob(track.id);
            } catch (e) {
                console.warn("Failed to delete track blob from DB:", e);
            }
        }
        const newPlaylist = customPlaylist.filter((_, idx) => idx !== index);
        let nextTrackIndex = currentTrackIndex;
        if (index === currentTrackIndex) {
            nextTrackIndex = index >= newPlaylist.length ? 0 : index;
            setCustomPlaylist(newPlaylist);
            if (synthRef.current) {
                synthRef.current.updatePlaylistOnly(newPlaylist, nextTrackIndex);
                if (newPlaylist.length > 0) {
                    synthRef.current.selectCustomTrack(nextTrackIndex);
                } else {
                    synthRef.current.setUseCustomBGM(useCustomBGM, newPlaylist);
                }
            }
        } else {
            if (index < currentTrackIndex) {
                nextTrackIndex = currentTrackIndex - 1;
            }
            setCustomPlaylist(newPlaylist);
            if (synthRef.current) {
                synthRef.current.updatePlaylistOnly(newPlaylist, nextTrackIndex);
            }
        }
    }, [customPlaylist, currentTrackIndex, useCustomBGM]);

    return {
        synthRef,
        bgmMuted,
        toggleBgmMuted,
        bgmVolume,
        setBgmVolume,
        sfxMuted,
        toggleSfxMuted,
        showAudioDropdown,
        setShowAudioDropdown,
        audioDropdownRef,
        useCustomBGM,
        setUseCustomBGM,
        customPlaylist,
        setCustomPlaylist,
        currentTrackIndex,
        isCustomAudioPanelOpen,
        setIsCustomAudioPanelOpen,
        mapTheme,
        setMapTheme,
        handleSelectTrack,
        handleNextTrack,
        handleAddLink,
        handleFileUpload,
        handleDeleteTrack
    };
}
