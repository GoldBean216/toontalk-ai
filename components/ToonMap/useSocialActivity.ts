import { useState, useCallback } from 'react';
import { Contact } from '../../types';
import { MapBuilding } from './types';
import { aStarPathfind, findClosestRoadNode } from '../../lib/pathfinding';

interface UseSocialActivityProps {
    contacts: Contact[];
    buildings: MapBuilding[];
    language: string;
}

export function useSocialActivity({ contacts, buildings, language }: UseSocialActivityProps) {
    const [showSocialPlanner, setShowSocialPlanner] = useState(false);
    const [selectedSocialType, setSelectedSocialType] = useState<'chat' | 'date' | 'quarrel'>('chat');
    const [selectedSocialTargets, setSelectedSocialTargets] = useState<string[]>([]);
    const [selectedSocialVenue, setSelectedSocialVenue] = useState<string>('');
    const [showWaitingModal, setShowWaitingModal] = useState(false);
    const [socialRequestStatus, setSocialRequestStatus] = useState<'idle' | 'waiting' | 'accepted' | 'rejected'>('idle');
    const [socialPlannerInitiator, setSocialPlannerInitiator] = useState<Contact | null>(null);

    const handleOpenSocialPlanner = useCallback((initiator: Contact) => {
        setSocialPlannerInitiator(initiator);
        setSelectedSocialType('chat');
        setSelectedSocialTargets([]);
        
        // Pick a default venue if available
        if (buildings.length > 0) {
            setSelectedSocialVenue(buildings[0].id);
        } else {
            setSelectedSocialVenue('');
        }
        
        setShowSocialPlanner(true);
    }, [buildings]);

    const handleCloseSocialPlanner = useCallback(() => {
        setShowSocialPlanner(false);
        setSocialPlannerInitiator(null);
    }, []);

    const handleStartSocialActivity = useCallback((
        aiSimulationsRef: React.MutableRefObject<Record<string, any>>,
        roadGrid: Record<string, any>
    ) => {
        if (!socialPlannerInitiator || selectedSocialTargets.length === 0 || !selectedSocialVenue) return;

        setShowSocialPlanner(false);
        setShowWaitingModal(true);
        setSocialRequestStatus('waiting');

        // Simulate AI decision making delay (2.5 seconds)
        setTimeout(() => {
            // High chance of acceptance
            const accepted = Math.random() < 0.85;

            if (accepted) {
                setSocialRequestStatus('accepted');
                
                const venueB = buildings.find(b => b.id === selectedSocialVenue);
                if (!venueB) {
                    setSocialRequestStatus('rejected');
                    return;
                }

                // Configure simulations
                const initiatorId = socialPlannerInitiator.id;
                const mode = selectedSocialType;

                // Configure for initiator
                const simA = aiSimulationsRef.current[initiatorId];
                if (simA) {
                    const startRoadNode = findClosestRoadNode(simA.x, simA.y, roadGrid);
                    const endRoadNode = findClosestRoadNode(venueB.x, venueB.y, roadGrid);
                    let path = [];
                    if (startRoadNode && endRoadNode) {
                        path = [
                            { x: simA.x, y: simA.y },
                            ...aStarPathfind(startRoadNode, endRoadNode, roadGrid),
                            { x: venueB.x, y: venueB.y }
                        ];
                    } else {
                        path = [{ x: simA.x, y: simA.y }, { x: venueB.x, y: venueB.y }];
                    }

                    simA.state = 'walking';
                    simA.path = path;
                    simA.pathIndex = 0;
                    simA.targetBuildingId = venueB.id;
                    simA.socialMode = mode;
                    simA.currentAction = language === "简体中文" 
                        ? `正在前往 ${venueB.name} 进行社交活动` 
                        : `Heading to ${venueB.name} for a social event`;
                    simA.chatBubble = "💬";
                    
                    if (mode === 'date') {
                        simA.datePartnerId = selectedSocialTargets[0];
                        simA.isLeadingDate = true;
                        simA.dateStops = [venueB.id];
                        simA.currentDateStop = 0;
                    }
                }

                // Configure for target(s)
                selectedSocialTargets.forEach((targetId, index) => {
                    const simT = aiSimulationsRef.current[targetId];
                    if (simT) {
                        const startRoadNode = findClosestRoadNode(simT.x, simT.y, roadGrid);
                        const endRoadNode = findClosestRoadNode(venueB.x, venueB.y, roadGrid);
                        let path = [];
                        if (startRoadNode && endRoadNode) {
                            path = [
                                { x: simT.x, y: simT.y },
                                ...aStarPathfind(startRoadNode, endRoadNode, roadGrid),
                                { x: venueB.x, y: venueB.y }
                            ];
                        } else {
                            path = [{ x: simT.x, y: simT.y }, { x: venueB.x, y: venueB.y }];
                        }

                        if (mode === 'date' && index === 0) {
                            simT.state = 'walking';
                            simT.targetBuildingId = venueB.id;
                            simT.socialMode = 'date';
                            simT.datePartnerId = initiatorId;
                            simT.isLeadingDate = false;
                            simT.currentAction = language === "简体中文" 
                                ? `准备和 ${socialPlannerInitiator.name} 进行约会 ❤️` 
                                : `On a date with ${socialPlannerInitiator.name} ❤️`;
                            simT.chatBubble = "❤️";
                        } else {
                            simT.state = 'walking';
                            simT.path = path;
                            simT.pathIndex = 0;
                            simT.targetBuildingId = venueB.id;
                            simT.socialMode = mode;
                            simT.currentAction = language === "简体中文" 
                                ? `正在前往 ${venueB.name} 参加聚会` 
                                : `Heading to ${venueB.name} for a meetup`;
                            simT.chatBubble = "💬";
                        }
                    }
                });

                // Generate greeting or post message
                const targetNames = selectedSocialTargets.map(id => contacts.find(c => c.id === id)?.name || id).join(', ');
                console.log(`[SOCIAL PLANNER] Initiated ${mode} between ${socialPlannerInitiator.name} and [${targetNames}] at ${venueB.name}`);
            } else {
                setSocialRequestStatus('rejected');
            }
        }, 2500);
    }, [socialPlannerInitiator, selectedSocialTargets, selectedSocialVenue, selectedSocialType, buildings, language, contacts]);

    const handleCancelWaiting = useCallback(() => {
        setShowWaitingModal(false);
        setSocialRequestStatus('idle');
    }, []);

    return {
        showSocialPlanner,
        setShowSocialPlanner,
        selectedSocialType,
        setSelectedSocialType,
        selectedSocialTargets,
        setSelectedSocialTargets,
        selectedSocialVenue,
        setSelectedSocialVenue,
        showWaitingModal,
        setShowWaitingModal,
        socialRequestStatus,
        setSocialRequestStatus,
        socialPlannerInitiator,
        handleOpenSocialPlanner,
        handleCloseSocialPlanner,
        handleStartSocialActivity,
        handleCancelWaiting
    };
}
