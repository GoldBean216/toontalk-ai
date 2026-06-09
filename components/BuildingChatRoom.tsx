import React, { useState, useEffect, useRef } from 'react';
import { Contact, Message, UserProfile } from '../types';
import { MapBuilding, MapBuildingContent, RenovatedLayout, CustomDecorNode, CustomPath } from './ToonMap/types';
import { BuildingBackground, THEME_DESKS, getThemeKey } from './BuildingBackground';
import { BuildingTrack } from './BuildingTrack';
import { BuildingCard } from './ToonMap/BuildingCard';
import { FormattedChatMessage } from './FormattedChatMessage';
import { Button } from './Button';
import { JumpGame } from './JumpGame';
import { ZumaGame } from './ZumaGame';
import { useSkillStore } from '../lib/skill-store';
import { PRESET_SKILLS } from '../lib/ai-skills';
import { getEffectiveBrainConfig } from '../services/gemini';
import { eventService } from '../lib/event-service';

interface BuildingChatRoomProps {
  building: MapBuilding;
  contact: Contact;
  currentUser: UserProfile;
  allContacts: Contact[];
  messages: Message[];
  isTyping: boolean;
  onSendMessage: (text: string) => void;
  onBack: () => void;
  buildings: MapBuilding[];
  setBuildings: React.Dispatch<React.SetStateAction<MapBuilding[]>>;
  language: string;
  onUpdateContactEnergy?: (contactId: string, newEnergy: number) => void;
}

const getTitleFromMarkdown = (markdown: string, defaultTitle: string) => {
  if (!markdown) return defaultTitle;
  const lines = markdown.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '');
    }
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return trimmed.replace(/^\*\*|\*\*$/g, '');
    }
    if (trimmed.length > 0) {
      return trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed;
    }
  }
  return defaultTitle;
};

export const BuildingChatRoom: React.FC<BuildingChatRoomProps> = ({
  building,
  contact,
  currentUser,
  allContacts,
  messages,
  isTyping,
  onSendMessage,
  onBack,
  buildings,
  setBuildings,
  language,
  onUpdateContactEnergy
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isTriggeringSkill, setIsTriggeringSkill] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [chatModeActive, setChatModeActive] = useState(true);

  const { installedSkills, isLoaded, loadInstalledSkills } = useSkillStore();
  useEffect(() => {
    if (!isLoaded) {
      loadInstalledSkills();
    }
  }, [isLoaded, loadInstalledSkills]);

  const handleRunAISkill = async () => {
    if (!currentBuilding.managerId) {
      alert(isChinese ? "必须先指派一名经理！" : "You must assign a manager first!");
      return;
    }
    const manager = allContacts.find(c => c.id === currentBuilding.managerId);
    if (!manager) {
      alert(isChinese ? "未找到经理信息！" : "Manager not found!");
      return;
    }
    const currentEnergy = manager.energy !== undefined ? manager.energy : 100;
    if (currentEnergy < 10) {
      alert(isChinese ? "经理能量不足，运行技能需要 10 能量！" : "Manager does not have enough energy. Running skill requires 10 energy!");
      return;
    }

    const skillId = currentBuilding.basicFunction;
    const skill = [...PRESET_SKILLS, ...installedSkills].find(s => s.id === skillId);
    const skillPrompt = skill?.handlerPrompt;

    setIsTriggeringSkill(true);
    setShowPlusMenu(false);

    try {
      // Resolve brain configs from localStorage
      let managerBrain: any = undefined;
      if (manager?.aiBrain?.apiKey) {
        managerBrain = manager.aiBrain;
      } else if (typeof window !== 'undefined') {
        const keysToTry = [
          currentUser?.id ? `toontalk_brain_${currentUser.id}_${manager.id}` : null,
          `toontalk_brain_${manager.id}`,
          manager?.stableId && manager.stableId !== manager.id && currentUser?.id ? `toontalk_brain_${currentUser.id}_${manager.stableId}` : null,
          manager?.stableId && manager.stableId !== manager.id ? `toontalk_brain_${manager.stableId}` : null,
        ].filter(Boolean) as string[];
        for (const key of keysToTry) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try { const p = JSON.parse(stored); if (p?.apiKey || p?.provider) { managerBrain = p; break; } } catch (_) {}
          }
        }
      }

      let globalBrain: any = null;
      if (typeof window !== 'undefined') {
        const globalKey = currentUser?.id ? `toontalk_global_ai_${currentUser.id}` : 'toontalk_global_ai';
        const storedGlobal = localStorage.getItem(globalKey);
        if (storedGlobal) {
          try { globalBrain = JSON.parse(storedGlobal); } catch (_) {}
        }
      }

      const effectiveManagerBrain = getEffectiveBrainConfig(managerBrain, globalBrain);

      const res = await fetch('/api/ai/building-function-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: currentBuilding.id,
          buildingName: currentBuilding.name,
          managerId: currentBuilding.managerId,
          basicFunction: currentBuilding.basicFunction,
          skillPrompt,
          brain: effectiveManagerBrain,
          userId: currentUser?.id,
          language
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          // Add generated content to building
          const contents = currentBuilding.generatedContents || [];
          const updatedBuilding = {
            ...currentBuilding,
            generatedContents: [data.content, ...contents].slice(0, 10),
            lastGenerationTime: Date.now()
          };
          await updateBuildingInList(updatedBuilding);

          // Deduct 10 energy
          if (onUpdateContactEnergy) {
            onUpdateContactEnergy(manager.id, Math.max(0, currentEnergy - 10));
          }

          // Record Event
          eventService.addEvent({
            type: 'PRODUCTION',
            characters: [currentBuilding.managerId || 'system'],
            location: currentBuilding.id,
            metadata: {
              buildingName: currentBuilding.name,
              buildingType: currentBuilding.type,
              contentId: data.content.id,
              contentMarkdown: data.content.markdown
            }
          });
          
          alert(isChinese ? "AI 技能运行成功，已产出新内容！" : "AI skill ran successfully, new content generated!");
        } else {
          alert(isChinese ? "运行失败，AI 未返回有效内容。" : "Execution failed: AI did not return content.");
        }
      } else {
        const errText = await res.text();
        alert((isChinese ? "请求失败: " : "Request failed: ") + errText);
      }
    } catch (e: any) {
      console.error("[BuildingChatRoom] Manual AI trigger error:", e);
      alert((isChinese ? "运行 AI 技能出错：" : "Error running AI skill: ") + e.message);
    } finally {
      setIsTriggeringSkill(false);
    }
  };

  const [renovationMode, setRenovationMode] = useState(false);
  const [editorLayout, setEditorLayout] = useState<RenovatedLayout>({ nodes: [], paths: [] });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Dragging states
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    nodeId: string | null;
    startX: number;
    startY: number;
    startNodeX: number;
    startNodeY: number;
  }>({
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    startNodeX: 0,
    startNodeY: 0
  });

  // Resizing states
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean;
    nodeId: string | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    isResizing: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  const [enableGuides, setEnableGuides] = useState(true);
  const [activeGuides, setActiveGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const [pathModeActive, setPathModeActive] = useState(false);
  const [firstPathNodeId, setFirstPathNodeId] = useState<string | null>(null);
  const [mousePosPct, setMousePosPct] = useState<{ x: number; y: number } | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'decors' | 'widgets'>('decors');

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const [isHoveringTrack, setIsHoveringTrack] = useState(false);
  const [manualShowTrack, setManualShowTrack] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const [prevIsTyping, setPrevIsTyping] = useState(isTyping);
  const [activeSidebarContent, setActiveSidebarContent] = useState<MapBuildingContent | null>(null);

  // New Plus Menu and Game States
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [gameActive, setGameActive] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [activeGame, setActiveGame] = useState<'jump' | 'zuma'>('zuma');
  const [aiReplyPopup, setAiReplyPopup] = useState<'track' | 'game'>('game');

  const prevIsTypingVal = useRef(isTyping);
  useEffect(() => {
    if (!chatModeActive) return; // Skip auto-popup when in manual scene mode
    // 1. AI starts typing (false -> true)
    if (!prevIsTypingVal.current && isTyping) {
      if (aiReplyPopup === 'game') {
        setGameActive(true);
        setIsGamePaused(false);
      } else {
        setGameActive(false);
      }
    }
    // 2. AI finishes typing (true -> false)
    else if (prevIsTypingVal.current && !isTyping) {
      if (gameActive) {
        setIsGamePaused(true);
        const timer = setTimeout(() => {
          setGameActive(false);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
    prevIsTypingVal.current = isTyping;
  }, [isTyping, gameActive, aiReplyPopup, chatModeActive]);

  // Sync currentBuilding state directly from the list prop to get latest updates
  const currentBuilding = buildings.find(b => b.id === building.id) || building;

  // Derived state to keep the active content updated if its likes/dislikes change
  const currentActiveSidebarContent = activeSidebarContent
    ? (currentBuilding.generatedContents || []).find(c => c.id === activeSidebarContent.id) || activeSidebarContent
    : null;

  // Sync state during render to avoid single-frame unmount/flicker
  if (isTyping !== prevIsTyping) {
    setPrevIsTyping(isTyping);
    if (!isTyping && isHoveringTrack) {
      setKeepOpen(true);
    } else if (isTyping) {
      setKeepOpen(false);
    }
  }

  const shouldShowTrack = isTyping || manualShowTrack || keepOpen;

  const isChinese = language === "简体中文";

  const handleEnterRenovationMode = () => {
    if (currentBuilding.renovatedLayout && currentBuilding.renovatedLayout.nodes.length > 0) {
      setEditorLayout(currentBuilding.renovatedLayout);
    } else {
      const theme = getThemeKey(currentBuilding.type);
      const defaultDesks = THEME_DESKS[theme] || THEME_DESKS.office;
      const convertedNodes: CustomDecorNode[] = defaultDesks.map((desk, idx) => ({
        id: `default-node-${idx}-${Date.now()}`,
        type: 'decor',
        label: desk.label,
        icon: desk.icon,
        x: desk.x,
        y: desk.y,
        width: 80,
        height: 80,
        rotation: 0,
        zIndex: 10,
        aiReachable: true
      }));
      setEditorLayout({
        nodes: convertedNodes,
        paths: []
      });
    }
    setSelectedNodeId(null);
    setFirstPathNodeId(null);
    setMousePosPct(null);
    setPathModeActive(false);
    setRenovationMode(true);
  };

  const handleSaveRenovation = async () => {
    const updatedBuilding = {
      ...currentBuilding,
      renovatedLayout: editorLayout
    };
    await updateBuildingInList(updatedBuilding);
    setRenovationMode(false);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    
    if (dragState.isDragging && dragState.nodeId) {
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      
      const pctDeltaX = (deltaX / rect.width) * 100;
      const pctDeltaY = (deltaY / rect.height) * 100;
      
      let newX = Math.max(0, Math.min(100, dragState.startNodeX + pctDeltaX));
      let newY = Math.max(0, Math.min(100, dragState.startNodeY + pctDeltaY));
      
      let guideX: number | null = null;
      let guideY: number | null = null;
      
      if (enableGuides) {
        const threshold = 1.5; // Snap threshold in percentage
        const otherNodes = editorLayout.nodes.filter(n => n.id !== dragState.nodeId);
        
        // Find closest X to snap
        let closestXNode = null;
        let minDiffX = Infinity;
        for (const other of otherNodes) {
          const diff = Math.abs(newX - other.x);
          if (diff < threshold && diff < minDiffX) {
            minDiffX = diff;
            closestXNode = other;
          }
        }
        if (closestXNode) {
          newX = closestXNode.x;
          guideX = closestXNode.x;
        }
        
        // Find closest Y to snap
        let closestYNode = null;
        let minDiffY = Infinity;
        for (const other of otherNodes) {
          const diff = Math.abs(newY - other.y);
          if (diff < threshold && diff < minDiffY) {
            minDiffY = diff;
            closestYNode = other;
          }
        }
        if (closestYNode) {
          newY = closestYNode.y;
          guideY = closestYNode.y;
        }
      }
      
      setActiveGuides({ x: guideX, y: guideY });
      
      setEditorLayout(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === dragState.nodeId ? { ...n, x: newX, y: newY } : n)
      }));
    }
    
    if (resizeState.isResizing && resizeState.nodeId) {
      const deltaX = e.clientX - resizeState.startX;
      const deltaY = e.clientY - resizeState.startY;
      
      const newWidth = Math.max(30, resizeState.startWidth + deltaX);
      const newHeight = Math.max(30, resizeState.startHeight + deltaY);
      
      setEditorLayout(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === resizeState.nodeId ? { ...n, width: newWidth, height: newHeight } : n)
      }));
    }
    if (pathModeActive && firstPathNodeId) {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMousePosPct({ x, y });
    }
  };

  const handleCanvasMouseUp = () => {
    if (dragState.isDragging) {
      setDragState(prev => ({ ...prev, isDragging: false, nodeId: null }));
      setActiveGuides({ x: null, y: null });
    }
    if (resizeState.isResizing) {
      setResizeState(prev => ({ ...prev, isResizing: false, nodeId: null }));
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: CustomDecorNode) => {
    e.stopPropagation();
    if (pathModeActive) {
      handlePathNodeClick(node.id);
      return;
    }
    
    setSelectedNodeId(node.id);
    setDragState({
      isDragging: true,
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX: node.x,
      startNodeY: node.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, node: CustomDecorNode) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedNodeId(node.id);
    setResizeState({
      isResizing: true,
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: node.width,
      startHeight: node.height
    });
  };

  const handlePathNodeClick = (nodeId: string) => {
    if (!firstPathNodeId) {
      setFirstPathNodeId(nodeId);
    } else {
      if (firstPathNodeId === nodeId) {
        setFirstPathNodeId(null);
        setMousePosPct(null);
        return;
      }
      
      const exists = editorLayout.paths.some(
        p => p.fromId === firstPathNodeId && p.toId === nodeId
      );
      
      if (!exists) {
        const newPath: CustomPath = {
          id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fromId: firstPathNodeId,
          toId: nodeId
        };
        setEditorLayout(prev => ({
          ...prev,
          paths: [...prev.paths, newPath]
        }));
      }
      
      setFirstPathNodeId(null);
      setMousePosPct(null);
    }
  };

  const handleAddNode = (type: 'decor' | 'image' | 'video' | 'gif', label: string, icon: string) => {
    const newNode: CustomDecorNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      label,
      icon,
      x: 45 + Math.random() * 10,
      y: 45 + Math.random() * 10,
      width: type === 'decor' ? 80 : 120,
      height: type === 'decor' ? 80 : 90,
      rotation: 0,
      url: type === 'image' 
        ? 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80'
        : (type === 'video' || type === 'gif' ? 'https://assets.mixkit.co/videos/preview/mixkit-coffee-maker-machine-brewing-coffee-41618-large.mp4' : undefined),
      zIndex: 10,
      aiReachable: true
    };
    
    setEditorLayout(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    setEditorLayout(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      paths: prev.paths.filter(p => p.fromId !== nodeId && p.toId !== nodeId)
    }));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleDeletePath = (pathId: string) => {
    setEditorLayout(prev => ({
      ...prev,
      paths: prev.paths.filter(p => p.id !== pathId)
    }));
  };

  const handleExportLayout = () => {
    const jsonStr = JSON.stringify(editorLayout, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentBuilding.name || 'building'}-layout.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.paths)) {
          setEditorLayout(parsed);
          setSelectedNodeId(null);
          setFirstPathNodeId(null);
        } else {
          alert(isChinese ? 'JSON 格式不正确！' : 'Invalid JSON layout format!');
        }
      } catch (err) {
        alert(isChinese ? '解析 JSON 文件失败！' : 'Failed to parse JSON file!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const BUILTIN_DECORS = [
    { label: isChinese ? '桌子' : 'Table', icon: '🪵', emoji: '🪵' },
    { label: isChinese ? '椅子' : 'Chair', icon: '🪑', emoji: '🪑' },
    { label: isChinese ? '电脑' : 'Computer', icon: '🖥️', emoji: '🖥️' },
    { label: isChinese ? '沙发' : 'Sofa', icon: '🛋️', emoji: '🛋️' },
    { label: isChinese ? '花卉' : 'Flowers', icon: '🌸', emoji: '🌸' },
    { label: isChinese ? '盆栽' : 'Potted Plant', icon: '🪴', emoji: '🪴' },
    { label: isChinese ? '咖啡杯' : 'Coffee Cup', icon: '☕', emoji: '☕' },
    { label: isChinese ? '画作' : 'Painting', icon: '🎨', emoji: '🎨' },
    { label: isChinese ? '壁灯' : 'Wall Lamp', icon: '💡', emoji: '💡' },
    { label: isChinese ? '书架' : 'Bookshelf', icon: '📚', emoji: '📚' }
  ];

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isTyping]);

  // Click outside listener for plus menu
  useEffect(() => {
    if (!showPlusMenu) return;
    const handleOutsideClick = () => {
      setShowPlusMenu(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showPlusMenu]);

  const handleSendText = () => {
    if (!inputValue.trim()) return;
    onSendMessage(inputValue);
    setInputValue('');
  };

  const updateBuildingInList = async (updated: MapBuilding) => {
    try {
      const nextBuildings = buildings.map(b => b.id === updated.id ? updated : b);
      setBuildings(nextBuildings);
      
      // Save to IndexedDB for persistence
      const { localChatDB } = await import('../lib/local-db');
      await localChatDB.saveBuilding(updated, currentUser.id);
      console.log(`[BuildingChatRoom] Saved building ${updated.name} to IndexedDB`);
    } catch (err) {
      console.error("[BuildingChatRoom] Failed to save building:", err);
    }
  };

  const handleReaction = async (contentId: string, type: 'like' | 'dislike') => {
    try {
      const reactorId = currentUser.id || 'user';
      const apiRes = await fetch('/api/ai/building-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, reaction: type, reactorId })
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.skipped) {
          console.log(`[BuildingChatRoom] User already reacted (${apiData.previousReaction}) to content ${contentId}`);
          return;
        }
        if (typeof apiData.likes === 'number') {
          const nextContents = (currentBuilding.generatedContents || []).map(c => {
            if (c.id === contentId) {
              return { ...c, likes: apiData.likes, dislikes: apiData.dislikes };
            }
            return c;
          });
          const healthChange = type === 'like' ? 2 : -1;
          const currentHealth = currentBuilding.health ?? 100;
          const newHealth = Math.min(100, Math.max(0, currentHealth + healthChange));
          const updatedBuilding = { ...currentBuilding, generatedContents: nextContents, health: newHealth };
          
          if (activeSidebarContent && activeSidebarContent.id === contentId) {
            setActiveSidebarContent(nextContents.find(c => c.id === contentId) || null);
          }
          await updateBuildingInList(updatedBuilding);
          return;
        }
      }
    } catch (apiErr) {
      console.warn('[BuildingChatRoom] Persist reaction API failed, falling back to optimistic update:', apiErr);
    }

    // Optimistic fallback
    const nextContents = (currentBuilding.generatedContents || []).map(c => {
      if (c.id === contentId) {
        return {
          ...c,
          likes: type === 'like' ? c.likes + 1 : c.likes,
          dislikes: type === 'dislike' ? c.dislikes + 1 : c.dislikes,
        };
      }
      return c;
    });

    const healthChange = type === 'like' ? 2 : -1;
    const currentHealth = currentBuilding.health ?? 100;
    const newHealth = Math.min(100, Math.max(0, currentHealth + healthChange));

    const updatedBuilding = {
      ...currentBuilding,
      generatedContents: nextContents,
      health: newHealth
    };
    
    if (activeSidebarContent && activeSidebarContent.id === contentId) {
      setActiveSidebarContent(nextContents.find(c => c.id === contentId) || null);
    }

    await updateBuildingInList(updatedBuilding);
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden bg-slate-100">
      {/* Dynamic Theme Background (Game View) */}
      {!renovationMode && (
        <BuildingBackground 
          buildingType={currentBuilding.type} 
          allContacts={allContacts} 
          currentContact={contact} 
          building={currentBuilding}
          isRenovating={false}
          gameModeActive={!chatModeActive}
          playerAvatarUrl={currentUser.avatarUrl}
        />
      )}

      {renovationMode ? (
        <div 
          className="absolute inset-0 flex z-30 select-none bg-slate-900/10 pointer-events-auto"
        >

          {/* Left Attributes Panel */}
          <div className="w-[280px] bg-white border-r-4 border-black flex flex-col z-20 shadow-[4px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-yellow-300 border-b-4 border-black p-4 select-none shrink-0">
              <h4 className="font-black text-sm uppercase tracking-wider">ℹ️ {isChinese ? '属性配置' : 'Attributes'}</h4>
              <p className="text-[9px] font-black text-slate-700 uppercase tracking-wide mt-0.5">
                {isChinese ? '设置所选控件的参数' : 'Configure selected control'}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-bold text-slate-800 text-xs">
              {selectedNodeId ? (() => {
                const node = editorLayout.nodes.find(n => n.id === selectedNodeId);
                if (!node) return <div className="text-center py-12 text-slate-400 font-bold">{isChinese ? '未选择节点' : 'No node selected'}</div>;
                const nodePaths = editorLayout.paths.filter(p => p.fromId === node.id || p.toId === node.id);
                
                return (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? '控件名称' : 'Name'}</label>
                      <input
                        type="text"
                        value={node.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditorLayout(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === node.id ? { ...n, label: val } : n)
                          }));
                        }}
                        className="w-full border-2 border-black rounded-lg p-2 bg-slate-50 font-black"
                      />
                    </div>

                    {(node.type === 'image' || node.type === 'video' || node.type === 'gif') && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? '链接地址 (URL)' : 'Media URL'}</label>
                          
                          {/* File Upload Trigger */}
                          <div>
                            <input
                              type="file"
                              accept={
                                node.type === 'image' ? 'image/*' : 
                                node.type === 'video' ? 'video/*' : 
                                node.type === 'gif' ? 'image/gif,image/*' : 'image/*,video/*'
                              }
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  const base64Data = reader.result as string;
                                  setEditorLayout(prev => ({
                                    ...prev,
                                    nodes: prev.nodes.map(n => n.id === node.id ? { ...n, url: base64Data } : n)
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }}
                              id={`node-upload-${node.id}`}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById(`node-upload-${node.id}`)?.click()}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-black rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight shadow-sm active:translate-y-px transition-all"
                            >
                              📁 {isChinese ? '本地上传' : 'Upload'}
                            </button>
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={node.url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, url: val } : n)
                            }));
                          }}
                          className="w-full border-2 border-black rounded-lg p-2 bg-slate-50 font-bold text-[10px] resize-none"
                          placeholder={
                            node.type === 'image' ? (isChinese ? "输入图片 URL 或点击上传" : "Enter image URL or upload") :
                            node.type === 'video' ? (isChinese ? "输入视频 URL 或点击上传" : "Enter video URL or upload") :
                            (isChinese ? "输入 GIF URL 或点击上传" : "Enter GIF URL or upload")
                          }
                        />
                        {node.url && node.url.startsWith('data:') && (
                          <div className="flex justify-between items-center text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                            <span>✅ {isChinese ? '本地文件已加载' : 'Local file loaded'} ({Math.round(node.url.length / 1024)} KB)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditorLayout(prev => ({
                                  ...prev,
                                  nodes: prev.nodes.map(n => n.id === node.id ? { ...n, url: '' } : n)
                                }));
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold ml-1 uppercase"
                            >
                              {isChinese ? '清除' : 'Clear'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">X (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={node.x}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, x: val as any } : n)
                            }));
                          }}
                          onBlur={(e) => {
                            const parsed = parseInt(e.target.value) || 0;
                            const clamped = Math.max(0, Math.min(100, parsed));
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, x: clamped } : n)
                            }));
                          }}
                          className="w-full border-2 border-black rounded-lg p-2 bg-slate-50 font-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Y (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={node.y}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, y: val as any } : n)
                            }));
                          }}
                          onBlur={(e) => {
                            const parsed = parseInt(e.target.value) || 0;
                            const clamped = Math.max(0, Math.min(100, parsed));
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, y: clamped } : n)
                            }));
                          }}
                          className="w-full border-2 border-black rounded-lg p-2 bg-slate-50 font-black"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? '宽度 (px)' : 'Width (px)'}</label>
                        <input
                          type="number"
                          min="20"
                          max="800"
                          value={node.width}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, width: val as any } : n)
                            }));
                          }}
                          onBlur={(e) => {
                            const parsed = parseInt(e.target.value) || 20;
                            const clamped = Math.max(20, Math.min(800, parsed));
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, width: clamped } : n)
                            }));
                          }}
                          className="w-full border-2 border-black rounded-lg p-2 bg-slate-50 font-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? '高度 (px)' : 'Height (px)'}</label>
                        <input
                          type="number"
                          min="20"
                          max="800"
                          value={node.height}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, height: val as any } : n)
                            }));
                          }}
                          onBlur={(e) => {
                            const parsed = parseInt(e.target.value) || 20;
                            const clamped = Math.max(20, Math.min(800, parsed));
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, height: clamped } : n)
                            }));
                          }}
                          className="w-full border-2 border-black rounded-lg p-2 bg-slate-50 font-black"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? '旋转角度' : 'Rotation'}</label>
                        <span className="font-black text-yellow-600">{node.rotation}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={node.rotation}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setEditorLayout(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === node.id ? { ...n, rotation: val } : n)
                          }));
                        }}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? '显示层级 (Layer)' : 'Display Layer (z-index)'}</label>
                        <span className="font-black text-indigo-600">{node.zIndex ?? 10}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={node.zIndex ?? 10}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 10;
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, zIndex: val } : n)
                            }));
                          }}
                          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={node.zIndex ?? 10}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : (parseInt(e.target.value) || 0);
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, zIndex: val as any } : n)
                            }));
                          }}
                          onBlur={(e) => {
                            const parsed = parseInt(e.target.value) || 10;
                            const clamped = Math.max(1, Math.min(100, parsed));
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, zIndex: clamped } : n)
                            }));
                          }}
                          className="w-12 border-2 border-black rounded-md p-0.5 text-center font-black bg-slate-50 text-[10px]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isChinese ? 'AI 角色可接触' : 'AI Reachable'}</label>
                        <span className="text-[8px] text-slate-400 font-bold leading-tight">
                          {isChinese ? '开启后 AI 会走到该控件，关闭则避开' : 'AI roamers will avoid walking to this control if disabled'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={node.aiReachable !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setEditorLayout(prev => ({
                              ...prev,
                              nodes: prev.nodes.map(n => n.id === node.id ? { ...n, aiReachable: val } : n)
                            }));
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 border border-black"></div>
                      </label>
                    </div>

                    {nodePaths.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">{isChinese ? '连接的路径' : 'Connected Paths'}</label>
                        <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pr-1">
                          {nodePaths.map((p) => {
                            const otherId = p.fromId === node.id ? p.toId : p.fromId;
                            const otherNode = editorLayout.nodes.find(n => n.id === otherId);
                            const otherLabel = otherNode ? `${otherNode.icon} ${otherNode.label}` : 'Unknown';
                            return (
                              <div key={p.id} className="flex items-center justify-between bg-slate-50 border border-black p-1.5 rounded-lg text-[10px]">
                                <span className="truncate max-w-[150px]">{otherLabel}</span>
                                <button
                                  onClick={() => handleDeletePath(p.id)}
                                  className="text-rose-500 hover:text-rose-700 font-bold px-1"
                                >
                                  🗑️
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleDeleteNode(node.id)}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 mt-4"
                    >
                      🗑️ {isChinese ? '删除该控件' : 'Delete Decor'}
                    </button>
                  </div>
                );
              })() : (
                <div className="text-center py-16 text-slate-400 font-bold leading-relaxed">
                  💡 {isChinese ? '点击画布上的物品可调整位置、大小、旋转角度或删除' : 'Click any placed element on the canvas to configure position, size, rotation or delete it.'}
                </div>
              )}
            </div>
          </div>

          {/* Central Workspace Canvas Editor (Scene View) */}
          <div 
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className="flex-1 relative overflow-hidden h-full z-10 pointer-events-auto border-x-4 border-black"
          >
            {/* Background inside Scene View */}
            <BuildingBackground 
              buildingType={currentBuilding.type} 
              allContacts={allContacts} 
              currentContact={contact} 
              building={currentBuilding}
              isRenovating={true}
            />

            {/* SVG Canvas overlay for paths and guides */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <defs>
                <marker
                  id="arrow-preview"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ec4899" />
                </marker>
                <marker
                  id="arrow-primary"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1e293b" />
                </marker>
                <marker
                  id="arrow-secondary"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6366f1" />
                </marker>
              </defs>

              {/* Alignment Guide Lines */}
              {enableGuides && activeGuides.x !== null && (
                <line
                  x1={`${activeGuides.x}%`}
                  y1="0%"
                  x2={`${activeGuides.x}%`}
                  y2="100%"
                  stroke="#ec4899"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="opacity-70 animate-[pulse_1.5s_infinite]"
                />
              )}
              {enableGuides && activeGuides.y !== null && (
                <line
                  x1="0%"
                  y1={`${activeGuides.y}%`}
                  x2="100%"
                  y2={`${activeGuides.y}%`}
                  stroke="#ec4899"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="opacity-70 animate-[pulse_1.5s_infinite]"
                />
              )}

              {/* Path Preview Arrow Line */}
              {pathModeActive && firstPathNodeId && mousePosPct && (() => {
                const fromNode = editorLayout.nodes.find(n => n.id === firstPathNodeId);
                if (!fromNode) return null;
                return (
                  <line
                    x1={`${(fromNode.x as any) !== '' ? fromNode.x : 0}%`}
                    y1={`${(fromNode.y as any) !== '' ? fromNode.y : 0}%`}
                    x2={`${mousePosPct.x}%`}
                    y2={`${mousePosPct.y}%`}
                    stroke="#ec4899"
                    strokeWidth="3.5"
                    strokeDasharray="6 6"
                    markerEnd="url(#arrow-preview)"
                    className="animate-[dash_2s_linear_infinite]"
                  />
                );
              })()}

              {editorLayout.paths.map((path) => {
                const fromNode = editorLayout.nodes.find(n => n.id === path.fromId);
                const toNode = editorLayout.nodes.find(n => n.id === path.toId);
                if (!fromNode || !toNode) return null;

                const fromX = (fromNode.x as any) !== '' ? Number(fromNode.x) : 0;
                const fromY = (fromNode.y as any) !== '' ? Number(fromNode.y) : 0;
                const toX = (toNode.x as any) !== '' ? Number(toNode.x) : 0;
                const toY = (toNode.y as any) !== '' ? Number(toNode.y) : 0;

                const dx = toX - fromX;
                const dy = toY - fromY;
                const len = Math.sqrt(dx * dx + dy * dy);

                let startX = fromX;
                let startY = fromY;
                let endX = toX;
                let endY = toY;

                // Shift lines slightly to the right of their direction vector to prevent overlapping on bi-directional paths
                const offsetAmount = 1.6; // offset in percentage of canvas
                if (len > 0) {
                  const px = -dy / len;
                  const py = dx / len;
                  startX += px * offsetAmount;
                  startY += py * offsetAmount;
                  endX += px * offsetAmount;
                  endY += py * offsetAmount;
                }

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                const isPrimary = path.fromId < path.toId;
                const pathColor = isPrimary ? '#1e293b' : '#6366f1';
                const pathMarker = isPrimary ? 'url(#arrow-primary)' : 'url(#arrow-secondary)';

                return (
                  <g key={path.id} className="group pointer-events-auto cursor-pointer">
                    {/* Invisible thicker path line for easy hover/interaction */}
                    <line
                      x1={`${startX}%`}
                      y1={`${startY}%`}
                      x2={`${endX}%`}
                      y2={`${endY}%`}
                      stroke="transparent"
                      strokeWidth="16"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePath(path.id);
                      }}
                    />
                    {/* Hover highlight line */}
                    <line
                      x1={`${startX}%`}
                      y1={`${startY}%`}
                      x2={`${endX}%`}
                      y2={`${endY}%`}
                      stroke="#ef4444"
                      strokeWidth="6"
                      className="opacity-0 group-hover:opacity-40 transition-opacity duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePath(path.id);
                      }}
                    />
                    {/* Actual dashed path line with direction marker */}
                    <line
                      x1={`${startX}%`}
                      y1={`${startY}%`}
                      x2={`${endX}%`}
                      y2={`${endY}%`}
                      stroke={pathColor}
                      strokeWidth="4"
                      strokeDasharray="6 6"
                      markerEnd={pathMarker}
                      className="animate-[dash_2s_linear_infinite] pointer-events-none"
                    />
                    {/* Deletion button at midpoint */}
                    <circle 
                      cx={`${midX}%`} 
                      cy={`${midY}%`} 
                      r="12" 
                      fill="#ef4444" 
                      stroke="black" 
                      strokeWidth="2"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePath(path.id);
                      }}
                    />
                    <text 
                      x={`${midX}%`} 
                      y={`${midY}%`} 
                      textAnchor="middle" 
                      dominantBaseline="central"
                      fill="white" 
                      fontSize="12" 
                      fontWeight="black"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none select-none"
                    >
                      ✕
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Canvas Node Placement Editor Area */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {editorLayout.nodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isFirstPathNode = node.id === firstPathNodeId;
                const isMultimedia = node.type === 'video' || node.type === 'gif';
                const isImage = node.type === 'image';
                
                const isValidTarget = pathModeActive && firstPathNodeId && firstPathNodeId !== node.id && !editorLayout.paths.some(
                  p => p.fromId === firstPathNodeId && p.toId === node.id
                );
                
                return (
                  <div
                    key={node.id}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    className={`absolute z-10 rounded-2xl group pointer-events-auto transition-all
                      ${isValidTarget ? 'cursor-pointer' : 'cursor-move'}
                      ${isSelected ? 'ring-4 ring-blue-500' : ''}
                      ${isFirstPathNode ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
                      ${isValidTarget ? 'ring-2 ring-emerald-500/40 ring-dashed hover:ring-4 hover:ring-emerald-500 hover:ring-solid' : ''}
                    `}
                    style={{
                      left: `${(node.x as any) !== '' ? node.x : 0}%`,
                      top: `${(node.y as any) !== '' ? node.y : 0}%`,
                      width: `${node.width || 20}px`,
                      height: `${node.height || 20}px`,
                      transform: `translate(-50%, -50%) rotate(${node.rotation}deg)`,
                      zIndex: (node.zIndex as any) !== '' ? (node.zIndex ?? 10) : 10
                    }}
                  >
                    {/* Inner wrapper to handle overflow-hidden and rounded borders for all children (image, video, decor) */}
                    <div className="w-full h-full flex flex-col items-center justify-center border-3 border-black rounded-2xl bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-shadow group-hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] overflow-hidden relative">
                      {isImage && node.url && (
                        <img src={node.url} alt={node.label} className="w-full h-full object-cover pointer-events-none select-none" />
                      )}
                      
                      {isMultimedia && node.url && (
                        (node.url.endsWith('.mp4') || node.url.endsWith('.webm') || node.url.includes('video')) ? (
                          <video src={node.url} autoPlay loop muted playsInline className="w-full h-full object-cover pointer-events-none" />
                        ) : (
                          <img src={node.url} alt={node.label} className="w-full h-full object-cover pointer-events-none select-none" />
                        )
                      )}
                      
                      {node.type === 'decor' && (
                        <div className="flex flex-col items-center justify-center text-center p-2 select-none pointer-events-none w-full h-full">
                          <span className="text-3xl animate-[bounceDesks_2s_infinite_ease-in-out]">
                            {node.icon}
                          </span>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mt-1 truncate max-w-full block">
                            {node.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Resize handle (bottom right corner, outside the overflow-hidden wrapper so it is fully visible and clickable) */}
                    {isSelected && (
                      <div
                        onMouseDown={(e) => handleResizeMouseDown(e, node)}
                        className="absolute bottom-[-8px] right-[-8px] w-6 h-6 bg-blue-500 hover:bg-blue-600 border-2 border-black rounded-full cursor-se-resize flex items-center justify-center shadow-lg z-30 pointer-events-auto active:scale-90 transition-transform"
                        title={isChinese ? "拉伸宽高" : "Resize"}
                      >
                        <span className="text-[10px] text-white font-black font-mono">↘</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Header controls inside canvas */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30 pointer-events-auto select-none">
              <div className="bg-white border-4 border-black p-2 px-4 rounded-full shadow-[3px_3px_0px_rgba(0,0,0,1)] font-black text-xs uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-rose-500 border border-black rounded-full animate-ping" />
                <span>🛠️ {isChinese ? '装修编辑模式' : 'Renovation Editor Mode'}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{currentBuilding.name}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleExportLayout}
                  className="bg-white hover:bg-slate-100 text-black font-black text-xs p-2.5 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
                  title={isChinese ? "导出 JSON 文件" : "Export Layout JSON"}
                >
                  📤 {isChinese ? '导出' : 'Export'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white hover:bg-slate-100 text-black font-black text-xs p-2.5 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5"
                  title={isChinese ? "导入 JSON 文件" : "Import Layout JSON"}
                >
                  📥 {isChinese ? '导入' : 'Import'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportLayout}
                />
                
                <button
                  onClick={() => setEnableGuides(prev => !prev)}
                  className={`font-black text-xs p-2.5 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5
                    ${enableGuides ? 'bg-indigo-300 hover:bg-indigo-400 text-black border-black' : 'bg-white hover:bg-slate-100 text-slate-500'}
                  `}
                  title={isChinese ? "开启/关闭对齐辅助线" : "Toggle alignment guide lines"}
                >
                  📏 {isChinese ? `辅助线: ${enableGuides ? '开' : '关'}` : `Guides: ${enableGuides ? 'ON' : 'OFF'}`}
                </button>

                <button
                  onClick={() => setRenovationMode(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-black text-xs p-2.5 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                >
                  {isChinese ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={handleSaveRenovation}
                  className="bg-yellow-300 hover:bg-yellow-400 text-black font-black text-xs p-2.5 px-4 rounded-xl border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
                >
                  💾 {isChinese ? '保存装修' : 'Save'}
                </button>
              </div>
            </div>

            {/* Floating indicator for Path Mode */}
            {pathModeActive && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-yellow-300 border-3 border-black p-2 px-4 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)] font-black text-[10px] z-30 pointer-events-auto flex items-center gap-2">
                <span>🛣️ {isChinese ? '路径连接模式激活：请依次点击要连接的两个控件' : 'Path connection active: Click two controls to connect them'}</span>
                {firstPathNodeId && (
                  <span className="bg-black text-white px-2 py-0.5 rounded-full text-[8px] animate-pulse">
                    {isChinese ? '已选第一个节点' : 'First node selected'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Blueprint / Catalog Panel */}
          <div className="w-[280px] bg-white border-l-4 border-black flex flex-col z-20 shadow-[-4px_0px_0px_rgba(0,0,0,1)]">
            {/* Header Tabs */}
            <div className="flex border-b-4 border-black bg-indigo-50 font-black text-xs shrink-0 select-none">
              <button
                onClick={() => {
                  setActiveRightTab('decors');
                  setPathModeActive(false);
                  setFirstPathNodeId(null);
                  setMousePosPct(null);
                }}
                className={`flex-1 py-4 text-center border-r-2 border-black transition-all uppercase tracking-wider ${
                  activeRightTab === 'decors'
                    ? 'bg-yellow-300 text-black'
                    : 'bg-indigo-50 text-slate-700 hover:bg-indigo-100'
                }`}
              >
                🌸 {isChinese ? '装饰物' : 'DECORS'}
              </button>
              <button
                onClick={() => setActiveRightTab('widgets')}
                className={`flex-1 py-4 text-center transition-all uppercase tracking-wider ${
                  activeRightTab === 'widgets'
                    ? 'bg-yellow-300 text-black'
                    : 'bg-indigo-50 text-slate-700 hover:bg-indigo-100'
                }`}
              >
                🧱 {isChinese ? '控件/组件' : 'CONTROLS'}
              </button>
            </div>

            {/* tab content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {activeRightTab === 'decors' && (
                <>
                  <div className="bg-blue-50 border-2 border-black p-3 rounded-xl text-[10px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] text-slate-700 leading-relaxed mb-1">
                    💡 {isChinese ? '点击下方内置家具/装饰物，直接放置到画布中央，随后拖拽调整位置。' : 'Click any decoration to add it to the canvas, then drag it into position.'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {BUILTIN_DECORS.map((decor, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAddNode('decor', decor.label, decor.emoji)}
                        className="bg-indigo-50/70 hover:bg-yellow-100/70 border-2 border-black p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] shadow-[2px_2px_0px_rgba(0,0,0,1)] group"
                      >
                        <span className="text-3xl group-hover:scale-110 transition-transform">{decor.icon}</span>
                        <span className="text-[10px] font-black text-slate-800 text-center">{decor.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeRightTab === 'widgets' && (
                <div className="flex flex-col gap-3">
                  <div className="bg-blue-50 border-2 border-black p-3 rounded-xl text-[10px] font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] text-slate-700 leading-relaxed">
                    💡 {isChinese ? '拖拽或点击下方控件放入画布。多媒体控件可支持自定义视频(MP4)或动态图。' : 'Add custom media widgets or draw AI paths.'}
                  </div>
                  
                  {/* Image Widget */}
                  <button
                    onClick={() => handleAddNode('image', isChinese ? '自定义图片' : 'Image Widget', '🖼️')}
                    className="w-full text-left bg-white hover:bg-slate-50 border-2 border-black p-3 rounded-xl flex items-center gap-3 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                  >
                    <div className="w-12 h-12 bg-sky-100 border border-black rounded-lg flex items-center justify-center text-2xl shrink-0">🖼️</div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-xs text-slate-800 uppercase block">{isChinese ? '🖼️ 图片控件' : '🖼️ Image Widget'}</span>
                      <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{isChinese ? '在画布放置自定义装饰画/背景' : 'Place custom image overlay'}</span>
                    </div>
                  </button>

                  {/* Multimedia Widget */}
                  <button
                    onClick={() => handleAddNode('video', isChinese ? '多媒体播放器' : 'Multimedia Widget', '🎬')}
                    className="w-full text-left bg-white hover:bg-slate-50 border-2 border-black p-3 rounded-xl flex items-center gap-3 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                  >
                    <div className="w-12 h-12 bg-amber-100 border border-black rounded-lg flex items-center justify-center text-2xl shrink-0">🎬</div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-xs text-slate-800 uppercase block">{isChinese ? '🎬 多媒体控件' : '🎬 Multimedia Widget'}</span>
                      <span className="text-[9px] text-slate-500 font-bold block mt-0.5">{isChinese ? '支持 MP4 视频与 GIF 动图' : 'Supports MP4 video & GIF'}</span>
                    </div>
                  </button>

                  <hr className="border-t-2 border-black/10 my-1" />

                  {/* Path Widget Toggle */}
                  <button
                    onClick={() => {
                      setPathModeActive(!pathModeActive);
                      setFirstPathNodeId(null);
                      setMousePosPct(null);
                    }}
                    className={`w-full text-left border-2 border-black p-3 rounded-xl flex items-center gap-3 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none
                      ${pathModeActive ? 'bg-yellow-300 border-black ring-2 ring-black ring-offset-2' : 'bg-white hover:bg-slate-50'}
                    `}
                  >
                    <div className={`w-12 h-12 border border-black rounded-lg flex items-center justify-center text-2xl shrink-0 ${pathModeActive ? 'bg-black text-white' : 'bg-rose-100'}`}>🛣️</div>
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-xs text-slate-800 uppercase block">{isChinese ? '🛣️ 路径连接器' : '🛣️ Path Connector'}</span>
                      <span className="text-[9px] text-slate-500 font-bold block mt-0.5">
                        {pathModeActive 
                          ? (isChinese ? '点击画布两个节点连线 (激活中)' : 'Click 2 nodes to connect (ACTIVE)') 
                          : (isChinese ? '激活后连接节点控制 AI 角色行走' : 'Connect nodes to draw paths for AI')}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @keyframes dash {
              to {
                stroke-dashoffset: -20;
              }
            }
          `}</style>
        </div>
      ) : (
        <div className="flex-1 flex h-full relative overflow-hidden z-10">
        {/* Left Side: Main Chat Panel */}
        <div className={`flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-transparent
          ${currentActiveSidebarContent ? 'w-full md:w-3/5 border-r-4 border-black' : 'w-full'}
        `}>
          
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-md border-b-4 border-black p-3.5 flex items-center shadow-md sticky top-0 gap-3 z-30 justify-between select-none">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={onBack} 
                className="text-xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all"
              >
                ←
              </button>
              <div className="relative shrink-0">
                <img
                  src={contact.avatarUrl}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-black object-cover bg-gray-200"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg border-2 border-black bg-white flex items-center justify-center text-xs shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                  {currentBuilding.emoji}
                </div>
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-lg leading-tight tracking-wide truncate flex items-center gap-1.5">
                  <span>{currentBuilding.name}</span>
                  <span className="text-[9px] bg-slate-100 border border-slate-300 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">
                    {currentBuilding.tag}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 font-bold truncate">
                  {isChinese ? `负责人: ${contact.name}` : `Manager: ${contact.name}`} • {contact.species}
                </p>
              </div>
            </div>

            {/* Right Header Controls (Settings & Renovation) */}
            <div className="flex gap-2">
              <button
                onClick={() => setChatModeActive(!chatModeActive)}
                className={`p-2.5 rounded-full border-2 border-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center shrink-0
                  ${chatModeActive ? 'bg-white hover:bg-slate-100' : 'bg-yellow-300 hover:bg-yellow-400'}
                `}
                title={isChinese ? (chatModeActive ? "切换到场景视图" : "返回聊天界面") : (chatModeActive ? "Switch to Scene View" : "Back to Chat View")}
              >
                {chatModeActive ? '💬' : '🎮'}
              </button>
              <button
                onClick={() => setShowDocPanel(true)}
                className="p-2.5 rounded-full hover:bg-slate-100 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center shrink-0"
                title={isChinese ? "查看产出文档" : "View Generated Documents"}
              >
                📁
              </button>
              <button
                onClick={handleEnterRenovationMode}
                className="p-2.5 rounded-full hover:bg-slate-100 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center shrink-0"
                title={isChinese ? "进入装修模式" : "Enter Renovation Mode"}
              >
                🎨
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 rounded-full hover:bg-slate-100 border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center shrink-0"
                title={isChinese ? "修改建筑设置" : "Edit Building Settings"}
              >
                ⚙️
              </button>
            </div>
          </div>

          {/* Message History list */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-6 bg-transparent"
            style={{ display: chatModeActive ? 'block' : 'none' }}
          >
            <div 
              className="max-w-4xl mx-auto w-full space-y-6 p-3.5 sm:p-6 rounded-[2.5rem] border-4 border-black/10 shadow-inner"
              style={{
                backgroundColor: `rgba(255, 255, 255, ${currentBuilding.chatMessageBgOpacity !== undefined ? currentBuilding.chatMessageBgOpacity : (currentBuilding.chatBgImage ? 0.8 : 0.45)})`,
                backdropFilter: `blur(${currentBuilding.chatMessageBlur !== undefined ? currentBuilding.chatMessageBlur : (currentBuilding.chatBgImage ? 8 : 2)}px)`
              }}
            >
              
              {messages.length === 0 && (
                <div className="text-center py-12 opacity-50 select-none">
                  <p className="text-4xl mb-2">🏢</p>
                  <p className="font-bold text-gray-500">
                    {isChinese ? `与负责人 ${contact.name} 开始对话吧！` : `Start a conversation with ${contact.name}!`}
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.senderId === 'user';
                const msgAvatar = isUser ? currentUser.avatarUrl : contact.avatarUrl;

                return (
                  <div key={msg.id} className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'} items-start`}>
                    
                    {/* Avatar Left */}
                    {!isUser && (
                      <img
                        src={msgAvatar}
                        alt="avatar"
                        className="w-12 h-12 rounded-full border-2 border-black bg-white object-cover flex-shrink-0 shadow-sm mt-1"
                      />
                    )}

                    <div className={`flex flex-col max-w-[65%] sm:max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}>
                      {/* Message Card */}
                      <div
                        className={`relative w-fit border-4 border-black rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white break-words break-all overflow-hidden
                          ${isUser ? 'bg-blue-300 rounded-tr-none' : 'bg-white rounded-tl-none'}
                        `}
                      >
                        <div className="font-bold text-lg leading-snug">
                          <FormattedChatMessage
                            text={msg.text}
                            inlineLinksOnly={true}
                            msgId={msg.id}
                          />
                        </div>
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-gray-500 block text-right mt-2 font-bold opacity-60">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Avatar Right */}
                    {isUser && (
                      <div className="w-12 h-12 rounded-full border-2 border-black bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm mt-1 overflow-hidden">
                        <img
                          src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png"
                          alt="Me"
                          className="w-9 h-9 object-contain"
                        />
                      </div>
                    )}

                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start items-start gap-3">
                  <img
                    src={contact.avatarUrl}
                    className="w-12 h-12 rounded-full border-2 border-black bg-gray-200 object-cover opacity-50 mt-1"
                    alt=""
                  />
                  <div className="bg-white border-4 border-black rounded-2xl rounded-tl-none p-4 shadow-[4px_4px_0px_rgba(0,0,0,0.1)] animate-bounce">
                    <span className="font-bold text-gray-400 tracking-widest">...</span>
                  </div>
                </div>
              )}
              
              <div ref={scrollRef} />
            </div>
          </div>

          {/* Game viewport with slide-up / slide-down transition */}
          <div 
            className="w-full overflow-hidden"
            style={{
              maxHeight: chatModeActive && gameActive ? '180px' : '0px',
              opacity: chatModeActive && gameActive ? 1 : 0,
              transform: chatModeActive && gameActive ? 'translateY(0)' : 'translateY(160px)',
              transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1), max-height 400ms ease-in-out, opacity 400ms ease-in-out',
              display: chatModeActive ? 'block' : 'none',
            }}
          >
            {activeGame === 'jump' && (
              <JumpGame 
                avatarUrl={contact.avatarUrl} 
                onClose={() => {
                  setGameActive(false);
                  setIsGamePaused(false);
                  setChatModeActive(true); // Return to chat mode if game closed
                }} 
                language={language}
                buildingType={currentBuilding.type}
                isPaused={isGamePaused}
              />
            )}

            {activeGame === 'zuma' && (
              <ZumaGame
                onClose={() => {
                  setGameActive(false);
                  setIsGamePaused(false);
                  setChatModeActive(true); // Return to chat mode if game closed
                }}
                language={language}
                buildingType={currentBuilding.type}
                isPaused={isGamePaused}
              />
            )}
          </div>

          {chatModeActive && !gameActive && shouldShowTrack && (
            <div 
              onMouseEnter={() => setIsHoveringTrack(true)}
              onMouseLeave={() => {
                setIsHoveringTrack(false);
                setKeepOpen(false);
              }}
              className="w-full relative"
            >
              <BuildingTrack 
                buildingType={currentBuilding.type} 
                generatedContents={currentBuilding.generatedContents || []}
                onSelectContent={(content) => setActiveSidebarContent(content)}
              />
            </div>
          )}

          {/* Input area */}
          {chatModeActive && (
            <div className="bg-white border-t-4 border-black p-3.5 sticky bottom-0 z-20">
              <div className="max-w-4xl mx-auto w-full flex gap-2.5 items-center">
                
                {/* Plus Button with Actions Popover */}
                <div className="relative shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlusMenu(!showPlusMenu);
                    }}
                    className={`rounded-full w-14 h-14 flex items-center justify-center border-4 border-black bg-white hover:bg-slate-100 shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all text-2xl font-black shrink-0
                      ${showPlusMenu ? 'bg-yellow-100 rotate-45' : ''}
                    `}
                    title={isChinese ? "操作菜单" : "Actions"}
                  >
                    ➕
                  </button>
                  
                  {showPlusMenu && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-[4.5rem] left-0 bg-white border-4 border-black rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-[4px_4px_0px_rgba(0,0,0,1)] z-30 animate-scaleUp min-w-[180px] text-left"
                    >
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-1">
                        {isChinese ? "手动控制" : "MANUAL CONTROLS"}
                      </div>

                      <button
                        onClick={handleRunAISkill}
                        disabled={isTriggeringSkill}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border-2 border-black bg-yellow-100 hover:bg-yellow-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none w-full"
                      >
                        <span>🧠</span>
                        <span>{isChinese ? (isTriggeringSkill ? "正在运行..." : "运行 AI 技能 (-10⚡)") : (isTriggeringSkill ? "Running..." : "Run AI Skill (-10⚡)")}</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveGame('jump');
                          setGameActive(true);
                          setIsGamePaused(false);
                          setShowPlusMenu(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border-2 border-black transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none w-full ${
                          gameActive && activeGame === 'jump' ? 'bg-yellow-200 hover:bg-yellow-300' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span>🏃</span>
                        <span>{isChinese ? "跳跃游戏" : "Jump Game"}</span>
                        {gameActive && activeGame === 'jump' && <span className="ml-auto text-[9px] bg-green-400 text-white px-1 rounded font-black">{isChinese ? "运行中" : "ON"}</span>}
                      </button>

                      <button
                        onClick={() => {
                          setActiveGame('zuma');
                          setGameActive(true);
                          setIsGamePaused(false);
                          setShowPlusMenu(false);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border-2 border-black transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none w-full ${
                          gameActive && activeGame === 'zuma' ? 'bg-purple-200 hover:bg-purple-300' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span>🔮</span>
                        <span>{isChinese ? "轨道消消乐" : "Zuma Match-3"}</span>
                        {gameActive && activeGame === 'zuma' && <span className="ml-auto text-[9px] bg-green-400 text-white px-1 rounded font-black">{isChinese ? "运行中" : "ON"}</span>}
                      </button>

                      {gameActive && (
                        <button
                          onClick={() => {
                            setGameActive(false);
                            setIsGamePaused(false);
                            setShowPlusMenu(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border-2 border-black bg-red-50 hover:bg-red-100 transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none w-full"
                        >
                          <span>🛑</span>
                          <span>{isChinese ? "退出游戏" : "Exit Game"}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder={isChinese ? "说点什么..." : "Say something..."}
                  className="flex-1 border-4 border-black rounded-full px-5 py-3 focus:outline-none focus:ring-4 ring-blue-200 font-bold text-lg"
                />
                <Button
                  onClick={handleSendText}
                  disabled={!inputValue.trim()}
                  className="rounded-full w-14 h-14 flex items-center justify-center p-0 !shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-blue-400 hover:bg-blue-500 text-white"
                >
                  ➤
                </Button>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Markdown Content Sidebar */}
        {currentActiveSidebarContent && (
          <div className="w-full md:w-2/5 h-full bg-white border-l-0 md:border-l-4 border-black flex flex-col z-30 shadow-[-4px_0px_0px_rgba(0,0,0,1)] relative animate-slideLeft">
            {/* Sidebar Header */}
            <div className="p-4 border-b-4 border-black flex justify-between items-center bg-yellow-300 shrink-0">
              <h3 className="font-black text-sm uppercase tracking-wide truncate max-w-[80%]">
                {getTitleFromMarkdown(currentActiveSidebarContent.markdown, isChinese ? '产出内容' : 'Generated Content')}
              </h3>
              <button 
                onClick={() => setActiveSidebarContent(null)}
                className="w-8 h-8 rounded-full border-2 border-black bg-white hover:bg-slate-100 flex items-center justify-center font-black shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
              >
                ✕
              </button>
            </div>
            
            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto p-6 font-bold text-slate-700 leading-relaxed selection:bg-yellow-200">
              <FormattedChatMessage text={currentActiveSidebarContent.markdown} />
            </div>
            
            {/* Sidebar Footer with Reactions */}
            <div className="p-4 border-t-4 border-black bg-slate-50 flex gap-3 shrink-0">
              <button 
                onClick={() => handleReaction(currentActiveSidebarContent.id, 'like')}
                className="flex-1 bg-white hover:bg-green-50 border-2 border-black py-3.5 rounded-xl font-black text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                👍 {isChinese ? '赞' : 'Like'} ({currentActiveSidebarContent.likes || 0})
              </button>
              <button 
                onClick={() => handleReaction(currentActiveSidebarContent.id, 'dislike')}
                className="flex-1 bg-white hover:bg-red-50 border-2 border-black py-3.5 rounded-xl font-black text-xs shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                👎 {isChinese ? '踩' : 'Dislike'} ({currentActiveSidebarContent.dislikes || 0})
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Settings Panel Overlay */}
      {showSettings && (
        <BuildingCard
          selectedBuilding={currentBuilding}
          setSelectedBuilding={() => setShowSettings(false)}
          buildings={buildings}
          setBuildings={setBuildings}
          contacts={allContacts}
          language={language}
          userId={currentUser.id}
        />
      )}

      {/* Generated Documents Panel Overlay */}
      {showDocPanel && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          onClick={() => setShowDocPanel(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-4 border-black rounded-[2rem] w-full max-w-lg flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden max-h-[80vh] relative text-black"
          >
            {/* Close button */}
            <button 
              onClick={() => setShowDocPanel(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-black font-black text-xl hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors z-[70]"
            >
              ✕
            </button>

            {/* Header */}
            <div className="bg-yellow-300 p-5 border-b-4 border-black flex gap-3 items-center rounded-t-2xl shrink-0">
              <div className="text-3xl shrink-0">📁</div>
              <div className="text-left min-w-0">
                <h3 className="text-xl font-black text-slate-900 leading-none">
                  {isChinese ? "产出文档列表" : "Generated Documents"}
                </h3>
                <p className="text-xs font-bold text-slate-700 mt-1.5 truncate">
                  {isChinese ? `${currentBuilding.name} 的 AI 负责人所产出的全部内容` : `All content produced by ${currentBuilding.name}'s manager`}
                </p>
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-indigo-50/20">
              {(!currentBuilding.generatedContents || currentBuilding.generatedContents.length === 0) ? (
                <div className="text-center py-10 text-slate-400 font-bold">
                  📭 {isChinese ? "暂无产出文档" : "No documents generated yet"}
                </div>
              ) : (
                currentBuilding.generatedContents.map((doc, idx) => {
                  const title = getTitleFromMarkdown(doc.markdown, isChinese ? `文档 #${idx + 1}` : `Document #${idx + 1}`);
                  return (
                    <div 
                      key={doc.id}
                      className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_rgba(0,0,0,1)] transition-all flex flex-col gap-3 text-left"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-black text-base text-slate-900 truncate">
                          {title}
                        </div>
                        <span className="text-[10px] bg-slate-100 border border-slate-300 text-slate-500 px-2 py-0.5 rounded-full shrink-0 font-bold">
                          #{idx + 1}
                        </span>
                      </div>
                      
                      {/* Snippet of content */}
                      <div className="text-xs text-slate-500 font-bold line-clamp-2 leading-relaxed text-left">
                        {doc.markdown.replace(/[#*`>_\-]/g, '').trim()}
                      </div>

                      {/* Footer Actions (View, Likes/Dislikes) */}
                      <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-1 shrink-0">
                        <div className="flex gap-3 text-xs font-black">
                          <span className="flex items-center gap-1 text-green-600">
                            👍 {doc.likes || 0}
                          </span>
                          <span className="flex items-center gap-1 text-red-500">
                            👎 {doc.dislikes || 0}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveSidebarContent(doc);
                            setShowDocPanel(false);
                          }}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[10px] px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                        >
                          {isChinese ? "查看详情" : "Details"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideLeft {
          0% { transform: translateX(100%); }
          100% { transform: translateX(0); }
        }
        .animate-slideLeft {
          animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scaleUp {
          0% { transform: scale(0.9) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-scaleUp {
          animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
