import React, { useRef, useEffect } from "react";
import { useLanguage } from "../lib/language-context";
import { useAuth } from "../lib/auth-context";

// Types
import { ToonMapProps, MapBuilding, Street, BuildTool } from "./ToonMap/types";

// Custom Hooks
import { useMapState } from "./ToonMap/useMapState";
import { useAudioState } from "./ToonMap/useAudioState";
import { useCameraControls } from "./ToonMap/useCameraControls";
import { useMapEditor } from "./ToonMap/useMapEditor";
import { useAISimulation } from "./ToonMap/useAISimulation";
import { useSocialActivity } from "./ToonMap/useSocialActivity";
import { eventService } from "../lib/event-service";

// UI Components
import { MapHeader } from "./ToonMap/MapHeader";
import { MapFilterBar } from "./ToonMap/MapFilterBar";
import { MapCanvas } from "./ToonMap/MapCanvas";
import { BuildingCard } from "./ToonMap/BuildingCard";
import { CharacterInfoCard } from "./ToonMap/CharacterInfoCard";
import { MapEditPanel } from "./ToonMap/MapEditPanel";
import { CustomItemModal } from "./ToonMap/CustomItemModal";
import { SocialPlannerModal } from "./ToonMap/SocialPlannerModal";
import { SocialWaitingModal } from "./ToonMap/SocialWaitingModal";
import { AudioCustomPanel } from "./ToonMap/AudioCustomPanel";
import { NewsPanel } from "./ToonMap/NewsPanel";
import { FormattedChatMessage } from "./FormattedChatMessage";

// Helpers
import { getContactWorldLocation, mergeOverlappingStreets } from "./ToonMap/mapUtils";
import { getContactLocation, MAP_TRANSLATIONS } from "./ToonMap/translations";

export const ToonMap: React.FC<ToonMapProps> = ({
    contacts,
    onBack,
    onChat,
    onViewHighNotes,
    onSimulationStateUpdate,
    onWeatherUpdate,
    onBuildingsUpdate,
    onDecideProactivity,
    onOpenGameLobby,
    onOpenMall,
    userInventory,
    onOpenSkillMall,
    onUpdateContactCoins,
    onUpdateContactState,
    onUpdateContactEnergy,
    activeCommand,
    setActiveCommand,
    onCompleteCommand
}) => {
    const { language } = useLanguage();
    const { user } = useAuth();
    const t = MAP_TRANSLATIONS[language as keyof typeof MAP_TRANSLATIONS] || MAP_TRANSLATIONS.English;

    const [showNews, setShowNews] = React.useState(false);

    // 1. Core Map States (Buildings, Streets, Weather, Time, Tasks, Selection)
    const mapState = useMapState({
        contacts,
        user,
        language
    });

    // 2. Audio State & Themes
    const audioState = useAudioState();

    // 3. Map Editor States (Build mode, drawing, dragging)
    const mapEditor = useMapEditor({
        buildings: mapState.buildings,
        setBuildings: mapState.setBuildings,
        streets: mapState.streets,
        setStreets: mapState.setStreets,
        customMapName: mapState.customMapName,
        setCustomMapName: mapState.setTempName,
        setSelectedBuilding: mapState.setSelectedBuilding,
        setSelectedContact: mapState.setSelectedContact,
        setPan: () => {},
        setZoom: () => {},
        language,
        t,
        userId: user?.id
    });

    // 4. Camera Zoom/Pan Controls
    const cameraControls = useCameraControls({
        isEditMode: mapEditor.isEditMode,
        buildTool: mapEditor.buildTool,
        drawingRoad: mapEditor.drawingRoad,
        setDrawingRoad: mapEditor.setDrawingRoad,
        draggingItem: mapEditor.draggingItem,
        setDraggingItem: mapEditor.setDraggingItem,
        buildings: mapState.buildings,
        setBuildings: mapState.setBuildings,
        streets: mapState.streets,
        setStreets: mapState.setStreets,
        setSelectedContact: mapState.setSelectedContact,
        setSelectedBuilding: mapState.setSelectedBuilding
    });

    // 5. Social Activities Coordinator
    const socialActivity = useSocialActivity({
        contacts,
        buildings: mapState.buildings,
        language
    });

    // 6. AI Agent Simulation Loops (500ms roaming, chatting, schedules)
    const hoveredContactIdRef = useRef<string | null>(null);
    useEffect(() => {
        hoveredContactIdRef.current = mapState.hoveredContactId;
    }, [mapState.hoveredContactId]);

    const handleBuildingVisited = React.useCallback((buildingId: string) => {
        mapState.setBuildingVisits(prev => ({
            ...prev,
            [buildingId]: (prev[buildingId] || 0) + 1
        }));
    }, [mapState.setBuildingVisits]);

    const aiSimulation = useAISimulation({
        contacts,
        buildings: mapState.buildings,
        roadGrid: mapState.roadGrid,
        language,
        user,
        weatherRef: mapState.weatherRef,
        gameHourRef: mapState.gameHourRef,
        hoveredContactIdRef,
        onBuildingsUpdate: mapState.setBuildings,
        onUpdateContactState,
        onUpdateContactEnergy,
        activeCommand,
        setActiveCommand,
        onCompleteCommand,
        onBuildingVisited: handleBuildingVisited
    });

    // Update parent about simulation state changes
    useEffect(() => {
        if (onSimulationStateUpdate) {
            onSimulationStateUpdate(aiSimulation.aiSimulationState);
        }
    }, [aiSimulation.aiSimulationState, onSimulationStateUpdate]);

    // Update parent about weather changes
    useEffect(() => {
        if (onWeatherUpdate) {
            onWeatherUpdate(mapState.weather);
        }
    }, [mapState.weather, onWeatherUpdate]);

    // Update parent about building configuration changes
    useEffect(() => {
        if (onBuildingsUpdate) {
            onBuildingsUpdate(mapState.buildings);
        }
    }, [mapState.buildings, onBuildingsUpdate]);

    // Triggers periodic proactive checks from characters
    useEffect(() => {
        if (!onDecideProactivity) return;
        const interval = setInterval(() => {
            const roamingAIs = contacts.filter((c) => c.isAi && !c.isGroup);
            if (roamingAIs.length === 0) return;
            const randomAI = roamingAIs[Math.floor(Math.random() * roamingAIs.length)];
            const sim = aiSimulation.aiSimulationState[randomAI.id];
            if (sim) {
                onDecideProactivity(randomAI, sim.currentAction || "wandering");
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [contacts, aiSimulation.aiSimulationState, onDecideProactivity]);

    // Coordinator Handlers
    const handleSelectContact = (c: any) => {
        mapState.setSelectedBuilding(null);
        mapState.setSelectedContact(c);

        const sim = aiSimulation.aiSimulationState[c.id];
        const worldPos = sim ? { x: sim.x, y: sim.y } : getContactWorldLocation(c, mapState.buildings);
        cameraControls.setPan({ x: -worldPos.x, y: -worldPos.y });
        cameraControls.setZoom(1.2);
    };

    const handleSelectBuilding = (b: MapBuilding) => {
        mapState.setSelectedContact(null);
        mapState.setSelectedBuilding(b);
        cameraControls.setPan({ x: -b.x, y: -b.y });
        cameraControls.setZoom(1.2);
    };

    // Drag and Drop implementation for placing items on map
    const handleDropOnMap = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        try {
            const dataStr = e.dataTransfer.getData("text/plain");
            if (!dataStr) return;
            const data = JSON.parse(dataStr);
            const rect = cameraControls.mapContainerRef.current?.getBoundingClientRect();
            if (!rect) return;
            
            const screenX = e.clientX - rect.left;
            const screenY = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const mapX = Math.round(((screenX - centerX) / cameraControls.zoom - cameraControls.pan.x) / 40) * 40;
            const mapY = Math.round(((screenY - centerY) / cameraControls.zoom - cameraControls.pan.y) / 40) * 40;

            if (data.type === "road" && data.template.type === "roundabout") {
                const newRoad: Street = {
                    id: `r_${Date.now()}`,
                    type: "roundabout",
                    coord: mapY,
                    start: mapX,
                    end: mapX + 80,
                    roadStyle: "two-lane"
                };
                const next = mergeOverlappingStreets([
                    ...mapState.streets,
                    newRoad
                ]);
                mapState.setStreets(next);
            } else if (data.type === "road") {
                const newRoad: Street = {
                    id: `r_${Date.now()}`,
                    type: data.template.roadType,
                    coord: data.template.roadType === "h" ? mapY : mapX,
                    start: Math.round(((data.template.roadType === "h" ? mapX : mapY) - data.template.length / 2) / 40) * 40,
                    end: Math.round(((data.template.roadType === "h" ? mapX : mapY) + data.template.length / 2) / 40) * 40,
                    roadStyle: "two-lane"
                };
                const next = mergeOverlappingStreets([
                    ...mapState.streets,
                    newRoad
                ]);
                mapState.setStreets(next);
            } else {
                const baseId = `b_${Date.now()}`;
                
                if (data.template.id === 'station') {
                    // Create Two Linked Stations
                    const idA = `${baseId}_A`;
                    const idB = `${baseId}_B`;
                    
                    const stationA: MapBuilding = {
                        id: idA,
                        name: `${data.template.name} A`,
                        type: data.template.type,
                        x: mapX,
                        y: mapY,
                        width: data.template.width,
                        height: data.template.height,
                        emoji: data.template.emoji,
                        description: data.template.description,
                        tag: data.template.tag,
                        actionText: data.template.actionText || "Interact 🔍",
                        imageUrl: data.template.imageUrl,
                        hasAnnounced: false,
                        linkedMetroId: idB
                    };
                    
                    const stationB: MapBuilding = {
                        id: idB,
                        name: `${data.template.name} B`,
                        type: data.template.type,
                        x: mapX + 200, // Offset for visibility
                        y: mapY + 200,
                        width: data.template.width,
                        height: data.template.height,
                        emoji: data.template.emoji,
                        description: data.template.description,
                        tag: data.template.tag,
                        actionText: data.template.actionText || "Interact 🔍",
                        imageUrl: data.template.imageUrl,
                        hasAnnounced: false,
                        linkedMetroId: idA
                    };
                    
                    const next = [...mapState.buildings, stationA, stationB];
                    mapState.setBuildings(next);
                } else {
                    const newB: MapBuilding = {
                        id: baseId,
                        name: data.template.name,
                        type: data.template.type,
                        x: mapX,
                        y: mapY,
                        width: data.template.width,
                        height: data.template.height,
                        emoji: data.template.emoji,
                        description: data.template.description,
                        tag: data.template.tag,
                        actionText: data.template.actionText || "Interact 🔍",
                        imageUrl: data.template.imageUrl,
                        hasAnnounced: false
                    };
                    const next = [...mapState.buildings, newB];
                    mapState.setBuildings(next);
                }
            }
        } catch (err) {
            console.error("Drop error:", err);
        }
    };

    return (
        <div className="w-full h-full flex flex-col relative select-none bg-slate-100 overflow-hidden font-sans">
            {/* Header */}
            <MapHeader
                onBack={onBack}
                customMapName={mapState.customMapName}
                language={language}
                zoom={cameraControls.zoom}
                isEditingName={mapState.isEditingName}
                tempName={mapState.tempName}
                setTempName={mapState.setTempName}
                handleStartEditName={mapState.handleStartEditName}
                handleSaveName={mapState.handleSaveName}
                handleCancelEdit={mapState.handleCancelEdit}
                handleZoomIn={cameraControls.handleZoomIn}
                handleZoomOut={cameraControls.handleZoomOut}
                handleResetZoom={cameraControls.handleResetZoom}
                bgmMuted={audioState.bgmMuted}
                sfxMuted={audioState.sfxMuted}
                toggleBgmMuted={audioState.toggleBgmMuted}
                toggleSfxMuted={audioState.toggleSfxMuted}
                bgmVolume={audioState.bgmVolume}
                setBgmVolume={audioState.setBgmVolume}
                setIsCustomAudioPanelOpen={audioState.setIsCustomAudioPanelOpen}
                showFog={mapState.showFog}
                setShowFog={mapState.setShowFog}
                isEditMode={mapEditor.isEditMode}
                setIsEditMode={mapEditor.setIsEditMode}
                handleSaveConfig={mapEditor.handleSaveConfig}
                isSavingConfig={mapEditor.isSavingConfig}
                handleExportMap={mapEditor.handleExportMap}
                importFileRef={mapEditor.importFileRef}
                handleImportMap={mapEditor.handleImportMap}
            />

            {/* Filter Bar */}
            <MapFilterBar
                activeFilter={mapState.activeFilter}
                onFilterChange={mapState.setActiveFilter}
                language={language}
            />

            {/* Main Area: Canvas & Edit Drawer Side-by-side */}
            <div className="flex-1 relative flex overflow-hidden">
                <MapCanvas
                    mapContainerRef={cameraControls.mapContainerRef}
                    zoom={cameraControls.zoom}
                    setZoom={cameraControls.setZoom}
                    pan={cameraControls.pan}
                    setPan={cameraControls.setPan}
                    isDragging={cameraControls.isDragging}
                    mapTheme={audioState.mapTheme}
                    streets={mapState.streets}
                    buildings={mapState.buildings}
                    activeFilter={mapState.activeFilter}
                    selectedContact={mapState.selectedContact}
                    selectedBuilding={mapState.selectedBuilding}
                    setSelectedBuilding={mapState.setSelectedBuilding}
                    isEditMode={mapEditor.isEditMode}
                    buildTool={mapEditor.buildTool}
                    drawingRoad={mapEditor.drawingRoad}
                    hoveredContactId={mapState.hoveredContactId}
                    setHoveredContactId={mapState.setHoveredContactId}
                    aiSimulationState={aiSimulation.aiSimulationState}
                    weather={mapState.weather}
                    setWeather={mapState.setWeather}
                    isWeatherAuto={mapState.isWeatherAuto}
                    setIsWeatherAuto={mapState.setIsWeatherAuto}
                    temperature={mapState.temperature}
                    setTemperature={mapState.setTemperature}
                    showFog={mapState.showFog}
                    timeOfDay={mapState.timeOfDay}
                    contacts={contacts}
                    language={language}
                    synthRef={audioState.synthRef}
                    buildingVisits={mapState.buildingVisits}
                    userId={user?.id}
                    
                    // Mouse and touch bindings from cameraControls
                    handleMouseDown={cameraControls.handleMouseDown}
                    handleMouseMove={cameraControls.handleMouseMove}
                    handleMouseUpOrLeave={cameraControls.handleMouseUpOrLeave}
                    handleTouchStart={cameraControls.handleTouchStart}
                    handleTouchMove={cameraControls.handleTouchMove}
                    
                    // Drag spawn bindings from mapEditor
                    handleDropOnMap={handleDropOnMap}
                    handleUpgradeRoad={mapEditor.handleUpgradeRoad}
                    handleDeleteStreet={mapEditor.handleDeleteStreet}
                    handleDeleteBuilding={mapEditor.handleDeleteBuilding}
                    handleItemDragStart={mapEditor.handleItemDragStart}
                    handleItemTouchStart={mapEditor.handleItemTouchStart}
                    
                    // Selection bindings
                    handleSelectContact={handleSelectContact}
                    handleSelectBuilding={handleSelectBuilding}
                    handleOpenNews={() => setShowNews(true)}
                    activeCommand={activeCommand}
                />

                {mapEditor.isEditMode && (
                    <MapEditPanel
                        isEditMode={mapEditor.isEditMode}
                        setIsEditMode={mapEditor.setIsEditMode}
                        isCatalogCollapsed={mapEditor.isCatalogCollapsed}
                        setIsCatalogCollapsed={mapEditor.setIsCatalogCollapsed}
                        activeCatalogTab={mapEditor.activeCatalogTab}
                        setActiveCatalogTab={mapEditor.setActiveCatalogTab}
                        buildTool={mapEditor.buildTool as any}
                        setBuildTool={mapEditor.setBuildTool as any}
                        hasNewMapDot={mapEditor.hasNewMapDot}
                        setHasNewMapDot={mapEditor.setHasNewMapDot}
                        customBuildings={mapEditor.customBuildings}
                        customDecors={mapEditor.customDecors}
                        customMaps={mapEditor.customMaps}
                        mapTheme={audioState.mapTheme}
                        setMapTheme={audioState.setMapTheme}
                        language={language}
                        handleSpawnItem={mapEditor.handleSpawnItem}
                        handleOpenCustomModal={mapEditor.handleOpenCustomModal}
                        handleDeleteCustomItem={mapEditor.handleDeleteCustomItem}
                        handleLoadMapPreset={mapEditor.handleLoadMapPreset}
                        handleImportMap={mapEditor.handleImportMap}
                    />
                )}
            </div>

            {/* Overlays / Modals */}
            {mapState.selectedBuilding && (
                <BuildingCard
                    selectedBuilding={mapState.selectedBuilding}
                    setSelectedBuilding={mapState.setSelectedBuilding}
                    buildings={mapState.buildings}
                    setBuildings={mapState.setBuildings}
                    contacts={contacts}
                    language={language}
                    onOpenGameLobby={onOpenGameLobby}
                    onOpenMall={onOpenMall}
                    onOpenSkillMall={onOpenSkillMall}
                    userId={user?.id}
                />
            )}

            {mapState.selectedContact && (
                <CharacterInfoCard
                    selectedContact={mapState.selectedContact}
                    setSelectedContact={mapState.setSelectedContact}
                    contacts={contacts}
                    onUpdateContactState={onUpdateContactState}
                    buildings={mapState.buildings}
                    aiSimulationState={aiSimulation.aiSimulationState}
                    language={language}
                    onChat={onChat}
                />
            )}

            {mapEditor.isCustomModalOpen && (
                <CustomItemModal
                    isCustomModalOpen={mapEditor.isCustomModalOpen}
                    setIsCustomModalOpen={mapEditor.setIsCustomModalOpen}
                    customModalTab={mapEditor.customModalTab as any}
                    editingCustomItem={mapEditor.editingCustomItem}
                    setEditingCustomItem={mapEditor.setEditingCustomItem}
                    customItemName={mapEditor.customItemName}
                    setCustomItemName={mapEditor.setCustomItemName}
                    customItemDescription={mapEditor.customItemDescription}
                    setCustomItemDescription={mapEditor.setCustomItemDescription}
                    customItemEmoji={mapEditor.customItemEmoji}
                    setCustomItemEmoji={mapEditor.setCustomItemEmoji}
                    customItemImageUrl={mapEditor.customItemImageUrl}
                    setCustomItemImageUrl={mapEditor.setCustomItemImageUrl}
                    customItemTag={mapEditor.customItemTag}
                    setCustomItemTag={mapEditor.setCustomItemTag}
                    customItemWidth={mapEditor.customItemWidth}
                    setCustomItemWidth={mapEditor.setCustomItemWidth}
                    customItemHeight={mapEditor.customItemHeight}
                    setCustomItemHeight={mapEditor.setCustomItemHeight}
                    language={language}
                    handleSaveCustomItem={mapEditor.handleSaveCustomItem}
                    handleImageFileChange={mapEditor.handleImageFileChange}
                />
            )}

            {socialActivity.showSocialPlanner && socialActivity.socialPlannerInitiator && (
                <SocialPlannerModal
                    contacts={contacts}
                    buildings={mapState.buildings}
                    language={language}
                    initiator={socialActivity.socialPlannerInitiator}
                    selectedSocialType={socialActivity.selectedSocialType}
                    setSelectedSocialType={socialActivity.setSelectedSocialType}
                    selectedSocialTargets={socialActivity.selectedSocialTargets}
                    setSelectedSocialTargets={socialActivity.setSelectedSocialTargets}
                    selectedSocialVenue={socialActivity.selectedSocialVenue}
                    setSelectedSocialVenue={socialActivity.setSelectedSocialVenue}
                    onStartActivity={() => socialActivity.handleStartSocialActivity(aiSimulation.aiSimulationsRef, mapState.roadGrid)}
                    onClose={socialActivity.handleCloseSocialPlanner}
                />
            )}

            {socialActivity.showWaitingModal && socialActivity.socialPlannerInitiator && (
                <SocialWaitingModal
                    targets={socialActivity.selectedSocialTargets.map(id => contacts.find(c => c.id === id)!).filter(Boolean)}
                    activityType={socialActivity.selectedSocialType}
                    status={socialActivity.socialRequestStatus}
                    initiator={socialActivity.socialPlannerInitiator}
                    language={language}
                    onClose={socialActivity.handleCancelWaiting}
                />
            )}

            {audioState.isCustomAudioPanelOpen && (
                <AudioCustomPanel
                    isCustomAudioPanelOpen={audioState.isCustomAudioPanelOpen}
                    setIsCustomAudioPanelOpen={audioState.setIsCustomAudioPanelOpen}
                    useCustomBGM={audioState.useCustomBGM}
                    setUseCustomBGM={audioState.setUseCustomBGM}
                    customPlaylist={audioState.customPlaylist}
                    currentTrackIndex={audioState.currentTrackIndex}
                    handleFileUpload={audioState.handleFileUpload}
                    handleAddLink={audioState.handleAddLink}
                    handleNextTrack={audioState.handleNextTrack}
                    handleSelectTrack={audioState.handleSelectTrack}
                    handleDeleteTrack={audioState.handleDeleteTrack}
                    bgmVolume={audioState.bgmVolume}
                    setBgmVolume={audioState.setBgmVolume}
                    language={language}
                />
            )}

            {showNews && (
                <NewsPanel 
                    language={language}
                    onClose={() => setShowNews(false)}
                    contacts={contacts}
                />
            )}
        </div>
    );
};
