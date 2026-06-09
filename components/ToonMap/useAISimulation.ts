import { useState, useEffect, useRef } from 'react';
import { Contact, ActiveCommand } from '../../types';
import { MapBuilding, MapBuildingContent } from './types';
import { aStarPathfind, findClosestRoadNode } from '../../lib/pathfinding';
import { eventService } from '../../lib/event-service';
import { useSkillStore } from '../../lib/skill-store';
import { PRESET_SKILLS } from '../../lib/ai-skills';
import { getEffectiveBrainConfig } from '../../services/gemini';

interface UseAISimulationProps {
    contacts: Contact[];
    buildings: MapBuilding[];
    roadGrid: Record<string, any>;
    language: string;
    user: any;
    weatherRef: React.MutableRefObject<string>;
    gameHourRef: React.MutableRefObject<number>;
    hoveredContactIdRef: React.MutableRefObject<string | null>;
    onBuildingsUpdate?: (buildings: MapBuilding[]) => void;
    onUpdateContactState?: (contactId: string, newState: 'work' | 'rest' | 'social' | 'sick' | 'hospitalized') => void;
    onUpdateContactEnergy?: (contactId: string, energy: number) => void;

    // Command system
    activeCommand?: ActiveCommand | null;
    setActiveCommand?: (cmd: ActiveCommand | null) => void;
    onCompleteCommand?: (command: ActiveCommand, result?: any) => void;
    onBuildingVisited?: (buildingId: string) => void;
}

export function useAISimulation({
    contacts,
    buildings,
    roadGrid,
    language,
    user,
    weatherRef,
    gameHourRef,
    hoveredContactIdRef,
    onBuildingsUpdate,
    onUpdateContactState,
    onUpdateContactEnergy,
    activeCommand,
    setActiveCommand,
    onCompleteCommand,
    onBuildingVisited
}: UseAISimulationProps) {
    const [aiSimulationState, setAiSimulationState] = useState<Record<string, any>>({});
    const commandTicksRef = useRef<number>(0);
    const lastTargetCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const pathfindCooldownRef = useRef<number>(0);
    const aiSimulationsRef = useRef<Record<string, any>>({});
    const lastGenerationTimesRef = useRef<Record<string, number>>({});
    const dislikeTrackingRef = useRef<Record<string, number>>({}); // Track dislikes: contactId_managerId -> count
    const reactedContentRef = useRef<Set<string>>(new Set()); // In-session dedup: "contactId_contentId"
    
    // Use refs to avoid constant interval restarts
    const buildingsRef = useRef(buildings);
    const onBuildingsUpdateRef = useRef(onBuildingsUpdate);
    const onBuildingVisitedRef = useRef(onBuildingVisited);
    
    useEffect(() => {
        buildingsRef.current = buildings;
    }, [buildings]);

    useEffect(() => {
        onBuildingsUpdateRef.current = onBuildingsUpdate;
    }, [onBuildingsUpdate]);

    useEffect(() => {
        onBuildingVisitedRef.current = onBuildingVisited;
    }, [onBuildingVisited]);

    const activeCommandRef = useRef(activeCommand);
    const onCompleteCommandRef = useRef(onCompleteCommand);
    const contactsRef = useRef(contacts);

    useEffect(() => { activeCommandRef.current = activeCommand; }, [activeCommand]);
    useEffect(() => { onCompleteCommandRef.current = onCompleteCommand; }, [onCompleteCommand]);
    useEffect(() => { contactsRef.current = contacts; }, [contacts]);

    // 1. Helper: Select a destination based on AI state
    const selectDestination = (c: Contact, currentSim: any) => {
        const state = c.aiState || 'rest';
        const currentBuildings = buildingsRef.current;
        
        // Sick or Hospitalized AIs go to hospital
        if (state === 'sick' || state === 'hospitalized') {
            const hospital = currentBuildings.find(b => b.type === 'hospital' || b.type === 'medical' || b.id === 'hospital' || b.name.includes('医院'));
            if (hospital) return hospital;
        }

        // Working AIs go to the building they manage
        if (state === 'work') {
            const managed = currentBuildings.find(b => b.managerId === c.id);
            if (managed) return managed;
        }

        // Social AIs prioritize buildings with many people or just other AIs
        if (state === 'social') {
            const buildingsWithContent = currentBuildings.filter(b => b.generatedContents && b.generatedContents.length > 0);
            if (buildingsWithContent.length > 0 && Math.random() < 0.7) {
                return buildingsWithContent[Math.floor(Math.random() * buildingsWithContent.length)];
            }
        }

        // Default / Wandering / Rest
        if (currentBuildings.length === 0) return null;
        const randomB = currentBuildings[Math.floor(Math.random() * currentBuildings.length)];
        return randomB;
    };

    const { installedSkills, loadInstalledSkills, isLoaded } = useSkillStore();

    // Load installed skills on mount if not already loaded
    useEffect(() => {
        if (!isLoaded) loadInstalledSkills();
    }, [isLoaded, loadInstalledSkills]);



    const triggerReaction = async (c: Contact, b: MapBuilding) => {
        if (!b.generatedContents || b.generatedContents.length === 0) return;
        const targetContent = b.generatedContents[0];

        // ── In-session dedup: skip if this AI already reacted this session ──
        const sessionKey = `${c.id}_${targetContent.id}`;
        if (reactedContentRef.current.has(sessionKey)) {
            console.log(`[Simulation] ${c.name} already reacted to content ${targetContent.id} this session. Skipping.`);
            return;
        }

        // Retrieve character brain config from local contact configuration or fallback to global brain
        let characterBrain: any = c.aiBrain || null;
        if (!characterBrain && typeof window !== 'undefined') {
            const key = user?.id ? `toontalk_brain_${user.id}_${c.id}` : `toontalk_brain_${c.id}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                try { characterBrain = JSON.parse(stored); } catch (_) {}
            }
        }
        
        let globalBrain: any = null;
        if (typeof window !== 'undefined') {
            const globalKey = user?.id ? `toontalk_global_ai_${user.id}` : 'toontalk_global_ai';
            const storedGlobal = localStorage.getItem(globalKey);
            if (storedGlobal) {
                try { globalBrain = JSON.parse(storedGlobal); } catch (_) {}
            }
        }

        const mergedBrain = getEffectiveBrainConfig(characterBrain, globalBrain);
        
        console.log(`[Simulation] AI ${c.name} reacting to content in ${b.name}, using key source: ${mergedBrain?.apiKey ? 'custom/global' : 'none'}`);
        try {
            const res = await fetch('/api/ai/building-reaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buildingId: b.id,
                    contactId: c.id,
                    contentId: targetContent.id,
                    contentMarkdown: targetContent.markdown,
                    brain: mergedBrain
                })
            });
            if (res.ok) {
                const data = await res.json();

                // Mark as reacted this session (even if DB said skipped)
                reactedContentRef.current.add(sessionKey);

                if (!data.skipped && onBuildingsUpdateRef.current) {
                    const updatedBuildings = buildingsRef.current.map(u => {
                        if (u.id === b.id) {
                            const newHealth = Math.min(100, Math.max(0, (u.health || 50) + (data.healthDelta || 0)));
                            const updatedContents = (u.generatedContents || []).map(gc => {
                                if (gc.id === targetContent.id) {
                                    const likes = data.reaction === 'like' ? gc.likes + 1 : gc.likes;
                                    const dislikes = data.reaction === 'dislike' ? gc.dislikes + 1 : gc.dislikes;
                                    return { ...gc, likes, dislikes };
                                }
                                return gc;
                            });
                            return { ...u, health: newHealth, generatedContents: updatedContents };
                        }
                        return u;
                    });
                    onBuildingsUpdateRef.current(updatedBuildings);
                }

                if (!data.skipped) {
                    eventService.addEvent({
                        type: 'COMMENT',
                        characters: [c.id],
                        location: b.id,
                        metadata: {
                            buildingName: b.name,
                            contentId: targetContent.id,
                            reaction: data.reaction
                        }
                    });

                    // Conflict Logic: Dislikes
                    if (data.reaction === 'dislike' && b.managerId) {
                        const trackKey = `${c.id}_${b.managerId}`;
                        const count = (dislikeTrackingRef.current[trackKey] || 0) + 1;
                        dislikeTrackingRef.current[trackKey] = count;

                        if (count >= 3) {
                            dislikeTrackingRef.current[trackKey] = 0;
                            
                            eventService.addEvent({
                                type: 'QUARREL',
                                characters: [c.id, b.managerId],
                                location: b.id,
                                metadata: {
                                    buildingName: b.name,
                                    reason: language === '简体中文' 
                                        ? `${c.name} 对 ${b.name} 的内容非常不满意！`
                                        : `${c.name} is very unhappy with the content at ${b.name}!`
                                }
                            });
                            
                            if (aiSimulationsRef.current[c.id]) {
                                aiSimulationsRef.current[c.id].chatBubble = "💢";
                                aiSimulationsRef.current[c.id].currentAction = language === '简体中文' ? "正在吵架！" : "Quarreling!";
                            }
                            if (aiSimulationsRef.current[b.managerId]) {
                                aiSimulationsRef.current[b.managerId].chatBubble = "💢";
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Failed to trigger reaction:", e);
        }
    };

    const triggerSocialGreet = async (charA: Contact, charB: Contact, mode: string = 'greeting') => {
        console.log(`[Simulation] Social Greet between ${charA.name} and ${charB.name} (${mode})`);
        try {
            const res = await fetch('/api/ai/social-greet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nameA: charA.name,
                    speciesA: charA.species,
                    personaA: charA.persona,
                    nameB: charB.name,
                    speciesB: charB.species,
                    mode
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.greeting && aiSimulationsRef.current[charA.id]) {
                    aiSimulationsRef.current[charA.id].chatBubble = data.greeting;
                    aiSimulationsRef.current[charA.id].chatTimer = 60; // 6 seconds
                    
                    // Add event
                    eventService.addEvent({
                        type: 'SOCIAL_INTERACTION',
                        characters: [charA.id, charB.id],
                        location: 'street',
                        metadata: {
                            mode,
                            message: data.greeting
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Failed to trigger social greet:", e);
        }
    };

    // 2. Main Simulation Loop (Movement and state transitions)
    useEffect(() => {
        if (buildings.length === 0 || Object.keys(roadGrid).length === 0) return;

        const interval = setInterval(() => {
            let changed = false;
            const roamingContacts = contactsRef.current.filter((c) => c.isAi && !c.isGroup);
            if (roamingContacts.length === 0) return;

            // Initialize simulations for new AIs
            roamingContacts.forEach((c) => {
                if (!aiSimulationsRef.current[c.id]) {
                    const b = buildingsRef.current[Math.floor(Math.random() * buildingsRef.current.length)];
                    aiSimulationsRef.current[c.id] = {
                        x: b?.x || 0,
                        y: b?.y || 0,
                        path: [],
                        pathIndex: 0,
                        targetBuildingId: b?.id || null,
                        state: "idle",
                        idleTimeRemaining: Math.floor(Math.random() * 50) + 20,
                        chatBubble: "",
                        chatTimer: 0,
                        currentAction: "Initializing...",
                        lastReactionTime: 0
                    };
                    changed = true;
                }
            });

            const activeCmd = activeCommandRef.current;

            // Check active command lifecycle
            if (activeCmd && activeCmd.phase !== 'done' && activeCmd.phase !== 'cancelled') {
                if (pathfindCooldownRef.current > 0) {
                    pathfindCooldownRef.current--;
                }
                const executorSim = aiSimulationsRef.current[activeCmd.executorId];
                if (executorSim) {
                    let targetX = 0;
                    let targetY = 0;
                    let targetSim = null;

                    if (activeCmd.type === 'goto') {
                        const targetB = buildingsRef.current.find(b => b.id === activeCmd.buildingId);
                        if (targetB) {
                            targetX = targetB.x;
                            targetY = targetB.y;
                        }
                    } else if (activeCmd.targetId) {
                        targetSim = aiSimulationsRef.current[activeCmd.targetId];
                        if (targetSim) {
                            // If target is walking, predict their position to intercept
                            if (targetSim.state === 'walking' && targetSim.path && targetSim.path[targetSim.pathIndex]) {
                                const nextPt = targetSim.path[targetSim.pathIndex];
                                const tDx = nextPt.x - targetSim.x;
                                const tDy = nextPt.y - targetSim.y;
                                const tDist = Math.sqrt(tDx * tDx + tDy * tDy);
                                if (tDist > 0) {
                                    let tSpeed = targetSim.aiState === 'rest' ? 2.5 : 5.0;
                                    if (weatherRef.current === 'rainy') tSpeed *= 0.8;
                                    if (weatherRef.current === 'snowy') tSpeed *= 0.6;
                                    
                                    // Scale prediction based on distance to prevent overshooting
                                    const eDx = targetSim.x - executorSim.x;
                                    const eDy = targetSim.y - executorSim.y;
                                    const eDist = Math.sqrt(eDx * eDx + eDy * eDy);
                                    
                                    let predictionTicks = 15;
                                    if (eDist < 100) {
                                        predictionTicks = 0; // Chase exact position when close
                                    } else if (eDist < 250) {
                                        predictionTicks = 8; // Predict less at medium range
                                    }
                                    
                                    targetX = targetSim.x + (tDx / tDist) * tSpeed * predictionTicks;
                                    targetY = targetSim.y + (tDy / tDist) * tSpeed * predictionTicks;
                                } else {
                                    targetX = targetSim.x;
                                    targetY = targetSim.y;
                                }
                            } else {
                                targetX = targetSim.x;
                                targetY = targetSim.y;
                            }
                        }
                    }

                    if (activeCmd.phase === 'moving') {
                        // Check distance to ACTUAL target position (not predicted)
                        let actualTargetX = targetX;
                        let actualTargetY = targetY;
                        if (targetSim) {
                            actualTargetX = targetSim.x;
                            actualTargetY = targetSim.y;
                        }
                        const dx = actualTargetX - executorSim.x;
                        const dy = actualTargetY - executorSim.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < 60) {
                            // Arrived! Start interaction
                            commandTicksRef.current = 0;
                            if (setActiveCommand) {
                                // If it is a date, start a romantic stroll to a date destination building instead of freezing in place!
                                if (activeCmd.type === 'date') {
                                    const nonMetroBuildings = buildingsRef.current.filter(b => b.type !== 'metro' && !b.linkedMetroId);
                                    const dateBuilding = nonMetroBuildings.length > 0
                                        ? nonMetroBuildings[Math.floor(Math.random() * nonMetroBuildings.length)]
                                        : buildingsRef.current[Math.floor(Math.random() * buildingsRef.current.length)];
                                        
                                    if (dateBuilding) {
                                        const updated = {
                                            ...activeCmd,
                                            phase: 'interacting' as const,
                                            dateDestinationId: dateBuilding.id,
                                            dateStrollComplete: false,
                                            targetX: actualTargetX,
                                            targetY: actualTargetY
                                        };
                                        activeCommandRef.current = updated;
                                        setActiveCommand(updated);

                                        // Set paths for both to walk together to the date spot!
                                        const startRoadNode1 = findClosestRoadNode(executorSim.x, executorSim.y, roadGrid);
                                        const startRoadNode2 = findClosestRoadNode(targetSim.x, targetSim.y, roadGrid);
                                        const endRoadNode = findClosestRoadNode(dateBuilding.x, dateBuilding.y, roadGrid);
                                        
                                        const executorName = contactsRef.current.find(c => c.id === activeCmd.executorId)?.name || activeCmd.executorId;
                                        const targetName = contactsRef.current.find(c => c.id === activeCmd.targetId)?.name || activeCmd.targetId;

                                        executorSim.state = 'walking';
                                        executorSim.pathIndex = 0;
                                        executorSim.targetBuildingId = dateBuilding.id;
                                        executorSim.currentAction = language === "简体中文" 
                                            ? `与 ${targetName} 前往 ${dateBuilding.name} 约会` 
                                            : `Dating stroll with ${targetName} to ${dateBuilding.name}`;
                                        
                                        if (targetSim) {
                                            targetSim.state = 'walking';
                                            targetSim.pathIndex = 0;
                                            targetSim.targetBuildingId = dateBuilding.id;
                                            targetSim.currentAction = language === "简体中文" 
                                                ? `与 ${executorName} 前往 ${dateBuilding.name} 约会` 
                                                : `Dating stroll with ${executorName} to ${dateBuilding.name}`;
                                        }

                                        if (startRoadNode1 && endRoadNode) {
                                            executorSim.path = [
                                                { x: executorSim.x, y: executorSim.y },
                                                ...aStarPathfind(startRoadNode1, endRoadNode, roadGrid),
                                                { x: dateBuilding.x, y: dateBuilding.y }
                                            ];
                                        } else {
                                            executorSim.path = [{ x: executorSim.x, y: executorSim.y }, { x: dateBuilding.x, y: dateBuilding.y }];
                                        }
                                        
                                        if (targetSim) {
                                            if (startRoadNode2 && endRoadNode) {
                                                targetSim.path = [
                                                    { x: targetSim.x, y: targetSim.y },
                                                    ...aStarPathfind(startRoadNode2, endRoadNode, roadGrid),
                                                    { x: dateBuilding.x, y: dateBuilding.y }
                                                ];
                                            } else {
                                                targetSim.path = [{ x: targetSim.x, y: targetSim.y }, { x: dateBuilding.x, y: dateBuilding.y }];
                                            }
                                        }
                                        return;
                                    }
                                }

                                const updated = {
                                    ...activeCmd,
                                    phase: 'interacting' as const,
                                    targetX: actualTargetX,
                                    targetY: actualTargetY
                                };
                                activeCommandRef.current = updated;
                                setActiveCommand(updated);
                            }
                        } else {
                            // Guide the executor towards the target
                            const distToLastTarget = Math.sqrt(
                                Math.pow(targetX - lastTargetCoordsRef.current.x, 2) + 
                                Math.pow(targetY - lastTargetCoordsRef.current.y, 2)
                            );

                            // Recalculate path if no path or target moved significantly and cooldown expired
                            const shouldRecalculate = !executorSim.path || 
                                                      executorSim.path.length === 0 || 
                                                      executorSim.state !== 'walking' || 
                                                      (distToLastTarget > 35 && pathfindCooldownRef.current === 0);

                            if (shouldRecalculate) {
                                pathfindCooldownRef.current = 5; // Cooldown for 500ms
                                lastTargetCoordsRef.current = { x: targetX, y: targetY };
                                const startRoadNode = findClosestRoadNode(executorSim.x, executorSim.y, roadGrid);
                                const endRoadNode = findClosestRoadNode(targetX, targetY, roadGrid);
                                
                                executorSim.state = 'walking';
                                executorSim.pathIndex = 0;
                                executorSim.targetBuildingId = activeCmd.type === 'goto' ? activeCmd.buildingId : null;
                                executorSim.currentAction = language === "简体中文" 
                                    ? `前往指令目标中... / Heading to target` 
                                    : `Heading to target...`;
                                
                                if (startRoadNode && endRoadNode) {
                                    executorSim.path = [
                                        { x: executorSim.x, y: executorSim.y },
                                        ...aStarPathfind(startRoadNode, endRoadNode, roadGrid),
                                        { x: targetX, y: targetY }
                                    ];
                                } else {
                                    executorSim.path = [
                                        { x: executorSim.x, y: executorSim.y },
                                        { x: targetX, y: targetY }
                                    ];
                                }
                            }
                        }
                    } else if (activeCmd.phase === 'interacting') {
                        const isStrolling = activeCmd.type === 'date' && activeCmd.dateDestinationId && !activeCmd.dateStrollComplete;
                        if (isStrolling) {
                            const destB = buildingsRef.current.find(b => b.id === activeCmd.dateDestinationId);
                            if (destB) {
                                const dx1 = destB.x - executorSim.x;
                                const dy1 = destB.y - executorSim.y;
                                const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                                
                                let dist2 = 0;
                                if (targetSim) {
                                    const dx2 = destB.x - targetSim.x;
                                    const dy2 = destB.y - targetSim.y;
                                    dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                                }
                                
                                const arrived = dist1 < 60 && (!targetSim || dist2 < 60);
                                if (arrived) {
                                    commandTicksRef.current = 0;
                                    if (setActiveCommand) {
                                        const updated = {
                                            ...activeCmd,
                                            dateStrollComplete: true
                                        };
                                        activeCommandRef.current = updated;
                                        setActiveCommand(updated);
                                    }
                                } else {
                                    commandTicksRef.current++;
                                    // Cycle bubbles during stroll
                                    if (commandTicksRef.current % 10 === 0) {
                                        executorSim.chatBubble = "❤️";
                                        executorSim.chatTimer = 5;
                                        if (targetSim) {
                                            targetSim.chatBubble = "💕";
                                            targetSim.chatTimer = 5;
                                        }
                                    }
                                    // Stroll safety timeout: 250 ticks (25s)
                                    if (commandTicksRef.current > 250) {
                                        commandTicksRef.current = 0;
                                        if (setActiveCommand) {
                                            const updated = {
                                                ...activeCmd,
                                                dateStrollComplete: true
                                            };
                                            activeCommandRef.current = updated;
                                            setActiveCommand(updated);
                                        }
                                    }
                                }
                            } else {
                                if (setActiveCommand) {
                                    const updated = {
                                        ...activeCmd,
                                        dateStrollComplete: true
                                    };
                                    activeCommandRef.current = updated;
                                    setActiveCommand(updated);
                                }
                            }
                            return;
                        }

                        commandTicksRef.current++;
                        
                        // Set emojis/bubbles and actions
                        if (activeCmd.type === 'fight') {
                            executorSim.chatBubble = "💥";
                            executorSim.chatTimer = 2;
                            executorSim.currentAction = language === "简体中文" ? "与角色对决中！" : "Fighting!";
                            if (targetSim) {
                                targetSim.chatBubble = "💢";
                                targetSim.chatTimer = 2;
                                targetSim.currentAction = language === "简体中文" ? "被挑战中！" : "Challenged!";
                            }
                        } else if (activeCmd.type === 'date') {
                            executorSim.chatBubble = "❤️";
                            executorSim.chatTimer = 2;
                            executorSim.currentAction = language === "简体中文" ? "甜美约会中..." : "Dating...";
                            if (targetSim) {
                                targetSim.chatBubble = "💕";
                                targetSim.chatTimer = 2;
                                targetSim.currentAction = language === "简体中文" ? "甜美约会中..." : "Dating...";
                            }
                        } else if (activeCmd.type === 'chat') {
                            const executorEmojis = ["💬", "💭", "👍", "💡"];
                            const execIdx = Math.floor(commandTicksRef.current / 15) % executorEmojis.length;
                            executorSim.chatBubble = executorEmojis[execIdx];
                            executorSim.chatTimer = 2;
                            executorSim.currentAction = language === "简体中文" ? "交谈中..." : "Chatting...";
                            if (targetSim) {
                                const targetEmojis = ["😊", "❓", "😄", "🤝"];
                                const targetIdx = Math.floor(commandTicksRef.current / 15) % targetEmojis.length;
                                targetSim.chatBubble = targetEmojis[targetIdx];
                                targetSim.chatTimer = 2;
                                targetSim.currentAction = language === "简体中文" ? "交谈中..." : "Chatting...";
                            }
                        } else if (activeCmd.type === 'goto') {
                            executorSim.chatBubble = "🔍";
                            executorSim.chatTimer = 2;
                            executorSim.currentAction = language === "简体中文" ? "审查建筑产出中..." : "Inspecting building...";
                            
                            // Trigger building content reaction on the first tick of interaction
                            if (commandTicksRef.current === 1) {
                                console.log(`[Simulation] Command goto arrived, triggering reaction for building: ${activeCmd.buildingId}`);
                                const targetB = buildingsRef.current.find(b => b.id === activeCmd.buildingId);
                                if (targetB && targetB.generatedContents && targetB.generatedContents.length > 0) {
                                    const executorContact = contactsRef.current.find(c => c.id === activeCmd.executorId);
                                    if (executorContact) {
                                        triggerReaction(executorContact, targetB);
                                    }
                                }
                            }
                        }

                        // Check duration complete (increased date interaction at spot to 60 ticks)
                        const duration = activeCmd.type === 'chat' ? 60 : (activeCmd.type === 'goto' ? 15 : (activeCmd.type === 'date' ? 60 : 30));
                        if (commandTicksRef.current >= duration) {
                            // Finish command
                            const result: any = {};
                            if (activeCmd.type === 'fight') {
                                result.winnerId = Math.random() > 0.5 ? activeCmd.executorId : activeCmd.targetId;
                            }
                            
                            // Reset bubbles
                            executorSim.chatBubble = "";
                            if (targetSim) targetSim.chatBubble = "";
                            
                            if (onCompleteCommandRef.current) {
                                onCompleteCommandRef.current(activeCmd, result);
                            }
                        }
                    }
                    changed = true;
                }
            }

            roamingContacts.forEach((c) => {
                const sim = aiSimulationsRef.current[c.id];
                if (!sim || hoveredContactIdRef.current === c.id) return;

                // Command system character interceptions
                if (activeCmd && activeCmd.phase !== 'done' && activeCmd.phase !== 'cancelled') {
                    const isStrolling = activeCmd.type === 'date' && activeCmd.dateDestinationId && !activeCmd.dateStrollComplete;
                    
                    if (activeCmd.targetId === c.id) {
                        // Freeze target character ONLY when interacting (and not strolling together)
                        if (activeCmd.phase === 'interacting' && !isStrolling) {
                            sim.state = "idle";
                            sim.idleTimeRemaining = 100;
                            sim.currentAction = language === "简体中文" ? "交互中..." : "Interacting...";
                            if (activeCmd.type === 'fight') sim.chatBubble = "💢";
                            else if (activeCmd.type === 'date') sim.chatBubble = "💕";
                            else if (activeCmd.type === 'chat') {
                                const targetEmojis = ["😊", "❓", "😄", "🤝"];
                                const targetIdx = Math.floor(commandTicksRef.current / 15) % targetEmojis.length;
                                sim.chatBubble = targetEmojis[targetIdx];
                            }
                            changed = true;
                            return; // Bypass normal idle/walking/transit logic
                        }
                    }

                    if (activeCmd.executorId === c.id) {
                        if (activeCmd.phase === 'interacting' && !isStrolling) {
                            // Freeze executor character during interaction (and not strolling together)
                            sim.state = "idle";
                            sim.idleTimeRemaining = 100;
                            sim.currentAction = language === "简体中文" ? "执行指令中..." : "Executing command...";
                            if (activeCmd.type === 'fight') sim.chatBubble = "💥";
                            else if (activeCmd.type === 'date') sim.chatBubble = "❤️";
                            else if (activeCmd.type === 'chat') {
                                const executorEmojis = ["💬", "💭", "👍", "💡"];
                                const execIdx = Math.floor(commandTicksRef.current / 15) % executorEmojis.length;
                                sim.chatBubble = executorEmojis[execIdx];
                            }
                            else if (activeCmd.type === 'goto') sim.chatBubble = "🔍";
                            changed = true;
                            return; // Bypass normal walking/idle
                        }
                    }
                }

                // 2.0.1 Dialogue Bubble Management
                if (sim.chatTimer && sim.chatTimer > 0) {
                    sim.chatTimer--;
                    if (sim.chatTimer <= 0) {
                        sim.chatBubble = "";
                        changed = true;
                    }
                }

                // 2.0.0 Social Greet Pause Handling (Freezes movement and simulates chatting)
                if (sim.socialPauseTimer && sim.socialPauseTimer > 0) {
                    sim.socialPauseTimer--;
                    // Every 8 ticks (0.8s), cycle bubble to mimic chatting
                    if (sim.socialPauseTimer % 8 === 0 && sim.socialPauseTimer > 0) {
                        const chatEmojis = ["💬", "💭", "👋", "😊", "😄", "✨", "🎵", "❤️", "👍", "..."];
                        sim.chatBubble = chatEmojis[Math.floor(Math.random() * chatEmojis.length)];
                    }
                    changed = true;
                    return; // Skip walking/idle logic to freeze the AI character
                }

                // 2.0 Transit Handling (Subway Animation)
                if (sim.transitStatus && sim.transitStatus !== 'none') {
                    if (sim.transitTimer && sim.transitTimer > 0) {
                        sim.transitTimer--;
                        changed = true;
                        return; // Freeze movement during transit
                    } else {
                        if (sim.transitStatus === 'entering') {
                            // Phase 2: Teleport and Start Exiting
                            const currentB = buildingsRef.current.find(b => b.id === sim.targetBuildingId);
                            if (currentB && currentB.linkedMetroId) {
                                const destinationB = buildingsRef.current.find(b => b.id === currentB.linkedMetroId);
                                if (destinationB) {
                                    sim.x = destinationB.x;
                                    sim.y = destinationB.y;
                                    sim.targetBuildingId = destinationB.id;
                                    sim.transitStatus = 'exiting';
                                    sim.transitTimer = 10; // 1s show animation
                                    sim.currentAction = language === "简体中文" ? `刚从地铁站 ${destinationB.name} 出来` : `Just emerged from ${destinationB.name}`;
                                    sim.chatBubble = "🚇";
                                } else {
                                    sim.transitStatus = 'none';
                                }
                            } else {
                                sim.transitStatus = 'none';
                            }
                        } else {
                            // Phase 3: Finish Exiting
                            sim.transitStatus = 'none';
                        }
                        changed = true;
                        return;
                    }
                }

                if (sim.state === "idle" || sim.state === "working" || sim.state === "resting") {
                    const isExecutorMoving = activeCmd && activeCmd.executorId === c.id && activeCmd.phase === 'moving';
                    if (isExecutorMoving) {
                        sim.state = "walking";
                        sim.path = [];
                        changed = true;
                        return;
                    }

                    sim.idleTimeRemaining--;
                    
                    const currentB = buildingsRef.current.find(b => b.id === sim.targetBuildingId);
                    
                    // Status Actions
                    if (c.aiState === 'sick') {
                        sim.currentAction = language === "简体中文" ? "正在医院康复中..." : "Recovering in the hospital...";
                        if (sim.chatTimer <= 0) sim.chatBubble = "🤒";
                    } else if (c.aiState === 'hospitalized') {
                        sim.currentAction = language === "简体中文" ? "住院中..." : "Hospitalized...";
                        if (sim.chatTimer <= 0) sim.chatBubble = "🚑";
                    } else if (c.aiState === 'work' && currentB?.managerId === c.id) {
                        sim.currentAction = language === "简体中文" ? `正在管理 ${currentB.name}` : `Managing ${currentB.name}`;
                        if (sim.chatTimer <= 0) sim.chatBubble = "💼";
                    } else {
                        sim.currentAction = currentB ? 
                            (language === "简体中文" ? `在 ${currentB.name} 休息` : `Resting at ${currentB.name}`) :
                            (language === "简体中文" ? "无所事事" : "Doing nothing");
                        if (sim.chatTimer <= 0) sim.chatBubble = "";
                    }

                    if (sim.idleTimeRemaining <= 0) {
                        const targetB = selectDestination(c, sim);
                        if (targetB && targetB.id !== sim.targetBuildingId) {
                            const startRoadNode = findClosestRoadNode(sim.x, sim.y, roadGrid);
                            const endRoadNode = findClosestRoadNode(targetB.x, targetB.y, roadGrid);
                            
                            sim.targetBuildingId = targetB.id;
                            sim.state = "walking";
                            sim.pathIndex = 0;
                            sim.currentAction = language === "简体中文" ? `前往 ${targetB.name}` : `Heading to ${targetB.name}`;
                            
                            if (startRoadNode && endRoadNode) {
                                sim.path = [
                                    { x: sim.x, y: sim.y },
                                    ...aStarPathfind(startRoadNode, endRoadNode, roadGrid),
                                    { x: targetB.x, y: targetB.y }
                                ];
                            } else {
                                sim.path = [{ x: sim.x, y: sim.y }, { x: targetB.x, y: targetB.y }];
                            }
                        } else {
                            sim.idleTimeRemaining = Math.floor(Math.random() * 100) + 50;
                        }
                    }
                    changed = true;
                } else if (sim.state === "walking") {
                    const targetPt = sim.path[sim.pathIndex];
                    if (!targetPt) {
                        const isExecutorMoving = activeCmd && activeCmd.executorId === c.id && activeCmd.phase === 'moving';
                        if (isExecutorMoving) {
                            sim.path = [];
                            sim.state = "walking";
                            changed = true;
                            return;
                        }

                        sim.state = "idle";
                        sim.idleTimeRemaining = Math.floor(Math.random() * 100) + 50;
                        const arrivedB = buildingsRef.current.find(b => b.id === sim.targetBuildingId);
                        if (arrivedB) {
                            if (onBuildingVisitedRef.current) onBuildingVisitedRef.current(arrivedB.id);
                            if (arrivedB.generatedContents && arrivedB.generatedContents.length > 0) {
                                triggerReaction(c, arrivedB);
                            }
                        }
                        return;
                    }

                    const dx = targetPt.x - sim.x;
                    const dy = targetPt.y - sim.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    // Increased speed for 100ms interval (was 0.8/1.6, now 2.5/5.0)
                    let speed = c.aiState === 'rest' ? 2.5 : 5.0;
                    if (activeCmd && activeCmd.executorId === c.id && activeCmd.phase === 'moving') {
                        speed = 7.5; // Command executor sprints towards target!
                    }
                    // Dynamic stroll speed for dating couple
                    const isStrollPartner = activeCmd && activeCmd.type === 'date' && activeCmd.phase === 'interacting' &&
                        activeCmd.dateDestinationId && !activeCmd.dateStrollComplete &&
                        (activeCmd.executorId === c.id || activeCmd.targetId === c.id);
                    if (isStrollPartner) {
                        speed = 3.5; // Walk side-by-side slowly and romantically
                    }
                    if (weatherRef.current === 'rainy') speed *= 0.8;
                    if (weatherRef.current === 'snowy') speed *= 0.6;

                    if (dist <= speed) {
                        sim.x = targetPt.x;
                        sim.y = targetPt.y;
                        sim.pathIndex++;
                        if (sim.pathIndex >= sim.path.length) {
                            sim.state = "idle";
                            sim.idleTimeRemaining = Math.floor(Math.random() * 100) + 50;
                            const arrivedB = buildingsRef.current.find(b => b.id === sim.targetBuildingId);
                            if (arrivedB) {
                                if (onBuildingVisitedRef.current) onBuildingVisitedRef.current(arrivedB.id);

                                // Subway Teleportation Logic
                                const isCommandTarget = activeCmd && activeCmd.phase === 'moving' && activeCmd.targetId === c.id;
                                if (arrivedB && arrivedB.linkedMetroId && !isCommandTarget) {
                                    console.log(`[Subway] ${c.name} entering ${arrivedB.name}`);
                                    sim.transitStatus = 'entering';
                                    sim.transitTimer = 10; // 1s hide animation
                                    sim.currentAction = language === "简体中文" ? `进入了地铁站 ${arrivedB.name}` : `Entering ${arrivedB.name}`;
                                    sim.chatBubble = "🚇";
                                    // Keep them idle for a bit longer after teleport
                                    sim.idleTimeRemaining += 50;
                                }

                                if (arrivedB.generatedContents && arrivedB.generatedContents.length > 0) {
                                    triggerReaction(c, arrivedB);
                                }
                            }
                        }
                    } else {
                        sim.x += (dx / dist) * speed;
                        sim.y += (dy / dist) * speed;
                    }
                    changed = true;
                }

                // 2.5 Proximity Check (Encounters)
                roamingContacts.forEach((other) => {
                    if (other.id === c.id) return;
                    
                    // Skip proximity street interactions if either character is involved in an active command
                    const isCommandRelated = activeCmd && 
                        (activeCmd.executorId === c.id || activeCmd.targetId === c.id || 
                         activeCmd.executorId === other.id || activeCmd.targetId === other.id);
                    if (isCommandRelated) return;
                    
                    const simOther = aiSimulationsRef.current[other.id];
                    if (!simOther) return;

                    const dX = simOther.x - sim.x;
                    const dY = simOther.y - sim.y;
                    const dist = Math.sqrt(dX * dX + dY * dY);

                    // If they are very close (less than 40 units)
                    if (dist < 40) {
                        const now = Date.now();
                        const lastEncounter = sim.lastEncounterTime || 0;
                        
                        // Only trigger once every 30 seconds per pair
                        if (now - lastEncounter > 30000) {
                            sim.lastEncounterTime = now;
                            simOther.lastEncounterTime = now;

                            // Date Interruption Logic
                            if (sim.socialMode === 'date' && sim.datePartnerId !== other.id) {
                                // 'other' interrupted 'c' who is on a date with someone else
                                const partnerId = sim.datePartnerId;
                                eventService.addEvent({
                                    type: 'QUARREL',
                                    characters: [partnerId, other.id], // The partner gets angry at the interloper
                                    location: 'street',
                                    metadata: {
                                        reason: language === '简体中文' 
                                            ? `${other.name} 打扰了 ${c.name} 的约会！`
                                            : `${other.name} interrupted ${c.name}'s date!`
                                    }
                                });
                                sim.chatBubble = "🗯️";
                                simOther.chatBubble = "❓";
                                if (aiSimulationsRef.current[partnerId]) {
                                    aiSimulationsRef.current[partnerId].chatBubble = "💢";
                                }
                            } else if (sim.socialMode !== 'quarrel' && simOther.socialMode !== 'quarrel') {
                                // Casual Greeting Logic (Local Visual Chat Simulation)
                                if (Math.random() < 0.85) { // 85% chance to greet when close
                                    const pauseDuration = Math.floor(Math.random() * 30) + 20; // 20 to 50 ticks (2s to 5s)
                                    
                                    sim.socialPauseTimer = pauseDuration;
                                    sim.chatTimer = pauseDuration;
                                    sim.chatBubble = "👋";
                                    sim.currentAction = language === "简体中文" ? `与 ${other.name} 闲聊中` : `Chatting with ${other.name}`;
                                    
                                    simOther.socialPauseTimer = pauseDuration;
                                    simOther.chatTimer = pauseDuration;
                                    simOther.chatBubble = "...";
                                    simOther.currentAction = language === "简体中文" ? `与 ${c.name} 闲聊中` : `Chatting with ${c.name}`;
                                    
                                    // Add a local event to log this interaction
                                    eventService.addEvent({
                                        type: 'SOCIAL_INTERACTION',
                                        characters: [c.id, other.id],
                                        location: 'street',
                                        metadata: {
                                            mode: 'greeting',
                                            message: `${c.name} and ${other.name} met on the street and shared some emojis.`
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            });

            if (changed) {
                const nextState: Record<string, any> = {};
                for (const [id, sim] of Object.entries(aiSimulationsRef.current)) {
                    nextState[id] = {
                        x: sim.x,
                        y: sim.y,
                        state: sim.state,
                        chatBubble: sim.chatBubble,
                        currentAction: sim.currentAction
                    };
                }
                setAiSimulationState(nextState);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [roadGrid, language, user, weatherRef, gameHourRef, hoveredContactIdRef]);



    // 3.5 Load Persisted Building Contents on Mount/Update
    const loadedPersistedRef = useRef<Record<string, boolean>>({});
    const prevUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (buildings.length === 0 || !onBuildingsUpdate) return;

        const currentUserId = user?.id || null;
        if (currentUserId !== prevUserIdRef.current) {
            loadedPersistedRef.current = {};
            prevUserIdRef.current = currentUserId;
        }

        const loadPersistedContents = async () => {
            const activeBuildings = buildings.filter(b => b.isActive && b.managerId && !loadedPersistedRef.current[b.id]);
            if (activeBuildings.length === 0) return;

            activeBuildings.forEach(b => {
                loadedPersistedRef.current[b.id] = true;
            });

            const updates: Record<string, any[]> = {};
            await Promise.all(
                activeBuildings.map(async (b) => {
                    try {
                        const userIdParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : '';
                        const res = await fetch(`/api/ai/building-contents?buildingId=${encodeURIComponent(b.id)}${userIdParam}`);
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.contents && data.contents.length > 0) {
                            updates[b.id] = data.contents;
                            console.log(`[Simulation] Loaded ${data.contents.length} persisted contents for building ${b.name}`);
                        }
                    } catch (e) {
                        // Non-fatal
                    }
                })
            );

            if (Object.keys(updates).length > 0) {
                const merged = buildings.map(b =>
                    updates[b.id]
                        ? { ...b, generatedContents: updates[b.id] }
                        : b
                );
                onBuildingsUpdate(merged);
            }
        };

        loadPersistedContents();
    }, [buildings, onBuildingsUpdate, user?.id]);

    // 4. Conflict Escalation Loop (15s timer)
    useEffect(() => {
        const interval = setInterval(async () => {
            const pendingQuarrels = await eventService.getRecentQuarrels();
            const now = Date.now();
            
            for (const q of pendingQuarrels) {
                // If a quarrel is older than 60 seconds and still pending, it escalates to a FIGHT
                if (now - q.timestamp > 60000) {
                    console.log(`[Conflict] Quarrel ${q.id} escalated to FIGHT!`);
                    
                    const fightEvent = await eventService.addEvent({
                        type: 'FIGHT',
                        characters: q.characters,
                        location: q.location,
                        metadata: {
                            ...q.metadata,
                            reason: language === '简体中文' ? "没人调解，冲突升级了！" : "No mediation, conflict escalated!"
                        }
                    });

                    // Update quarrel status
                    q.status = 'ESCALATED';
                    await eventService.updateEvent(q);

                    // Send participants to hospital
                    if (onUpdateContactState) {
                        q.characters.forEach(charId => {
                            onUpdateContactState(charId, 'hospitalized');
                            
                            // Move them to hospital in simulation immediately
                            if (aiSimulationsRef.current[charId]) {
                                const hospital = buildingsRef.current.find(b => b.type === 'hospital' || b.id === 'hospital' || b.name.includes('医院'));
                                if (hospital) {
                                    aiSimulationsRef.current[charId].x = hospital.x;
                                    aiSimulationsRef.current[charId].y = hospital.y;
                                    aiSimulationsRef.current[charId].state = 'resting';
                                    aiSimulationsRef.current[charId].currentAction = language === '简体中文' ? "住院中..." : "Hospitalized...";
                                    aiSimulationsRef.current[charId].chatBubble = "🚑";
                                }
                            }
                        });
                    }
                }
            }
        }, 15000);
        return () => clearInterval(interval);
    }, [language, onUpdateContactState]);

    return {
        aiSimulationState,
        aiSimulationsRef
    };
}
