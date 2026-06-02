import { MapBuilding, Street } from './types';
import { Contact } from '../../types';
import { getContactLocation } from './translations';

/**
 * Merge overlapping or touching road segments of the same type/coord/style
 */
export function mergeOverlappingStreets(streetsList: Street[]): Street[] {
    const result: Street[] = [];
    const straightRoads: Street[] = [];
    // Keep roundabouts and curves as they are
    for (const s of streetsList) {
        if (s.type === "roundabout" || s.type === "curve") {
            result.push(s);
        } else {
            straightRoads.push(s);
        }
    }
    // Group by type ('h' or 'v'), coord, and roadStyle
    const groups: Record<string, Street[]> = {};
    for (const s of straightRoads) {
        const style = s.roadStyle || "two-lane";
        const key = `${s.type}_${s.coord}_${style}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(s);
    }
    for (const key in groups) {
        const roads = groups[key];
        // Sort roads by start coordinate
        roads.sort((a, b) => {
            const startA = a.start ?? 0;
            const startB = b.start ?? 0;
            return startA - startB;
        });
        const merged: Street[] = [];
        for (const r of roads) {
            if (merged.length === 0) {
                merged.push({ ...r });
            } else {
                const last = merged[merged.length - 1];
                const rStart = r.start ?? 0;
                const lastEnd = last.end ?? 0;
                // If they overlap or touch (tolerance of 5px)
                if (rStart <= lastEnd + 5) {
                    last.end = Math.max(lastEnd, r.end ?? 0);
                } else {
                    merged.push({ ...r });
                }
            }
        }
        result.push(...merged);
    }
    return result;
}

/**
 * Generate a random 16-character token for unique IDs
 */
export function generateRandomToken(): string {
    return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Convert screen pixel coordinates to map world coordinates
 * accounting for the current pan offset and zoom level
 */
export function getMapCoords(
    clientX: number,
    clientY: number,
    container: HTMLDivElement | null,
    pan: { x: number; y: number },
    zoom: number
): { x: number; y: number } {
    const rect = container?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mapX = (screenX - centerX) / zoom - pan.x;
    const mapY = (screenY - centerY) / zoom - pan.y;
    return { x: mapX, y: mapY };
}

/**
 * Map characters directly into absolute world coordinates relative to the origin (0, 0)
 * Adjusted so they stand beautifully outside the doors/entrances on the streets
 */
export const getContactWorldLocation = (c: Contact, buildings: MapBuilding[] = []): {
    x: number;
    y: number;
    placeName: string;
    icon: string;
} => {
    const loc = getContactLocation(c);
    const hash = c.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = (hash % 5) * 32 - 64;
    const getBuildingPos = (targetId: string, defaultX: number, defaultY: number) => {
        const b = buildings.find((b) => b.id === targetId);
        return b ? { x: b.x, y: b.y } : { x: defaultX, y: defaultY };
    };
    switch (loc.roomName) {
        case "Workstation": {
            const p = getBuildingPos("hq", -500, -400);
            return {
                x: p.x + offset,
                y: p.y + 100 + (hash % 3) * 10,
                placeName: "ToonTalk HQ",
                icon: loc.icon
            };
        }
        case "Toon Café": {
            const p = getBuildingPos("cafe", 450, -350);
            return {
                x: p.x + offset,
                y: p.y + 90 + (hash % 3) * 10,
                placeName: "Toon Café Patio",
                icon: loc.icon
            };
        }
        case "Splash Restroom": {
            const p = getBuildingPos("plaza", -150, -80);
            return {
                x: p.x + offset,
                y: p.y + 90 + (hash % 3) * 15,
                placeName: "Water Plaza Park",
                icon: loc.icon
            };
        }
        case "Cozy Lounge":
            if (loc.activity.toLowerCase().includes("game") || loc.activity.toLowerCase().includes("arcade")) {
                const p = getBuildingPos("arcade", 350, 400);
                return {
                    x: p.x + offset,
                    y: p.y + 80 + (hash % 3) * 10,
                    placeName: "Arcade Zone Entrance",
                    icon: loc.icon
                };
            } else {
                const p = getBuildingPos("cinema", 550, 100);
                return {
                    x: p.x + offset,
                    y: p.y + 80 + (hash % 3) * 10,
                    placeName: "Cinema Sidewalk",
                    icon: loc.icon
                };
            }
        case "Cloud Garden": {
            const p = getBuildingPos("gym", -600, 150);
            return {
                x: p.x + offset,
                y: p.y + 70 + (hash % 3) * 10,
                placeName: "Gym Training Ground",
                icon: loc.icon
            };
        }
        default: {
            const p = getBuildingPos("plaza", -150, -80);
            return {
                x: p.x + offset,
                y: p.y + 70 + (hash % 3) * 10,
                placeName: "Town Square",
                icon: loc.icon
            };
        }
    }
};
