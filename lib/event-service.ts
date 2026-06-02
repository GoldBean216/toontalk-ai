import { localChatDB } from './local-db';

export type ToonEventType = 
    | 'OPENING'      // Building opened
    | 'PRODUCTION'   // AI produced content
    | 'COMMENT'      // AI commented/reacted
    | 'QUARREL'      // Argument between AIs
    | 'FIGHT'        // Physical fight
    | 'HOSPITALIZED' // AI sent to hospital
    | 'SOCIAL_INTERACTION' // AI chatted on street

export interface ToonEvent {
    id: string;
    type: ToonEventType;
    timestamp: number;
    characters: string[]; // Character IDs involved
    location: string;    // Building ID or coordinates
    title?: string;      // AI generated news title
    content?: string;    // AI generated news body
    metadata: {
        buildingName?: string;
        buildingType?: string;
        contentId?: string;
        contentMarkdown?: string;
        reaction?: string;
        comment?: string;
        reason?: string;
        isResolved?: boolean;
        mode?: string;
        message?: string;
    };
    status: 'PENDING' | 'RESOLVED' | 'ESCALATED';
}

class EventService {
    public language: string = 'English';
    private listeners: ((event: ToonEvent) => void)[] = [];

    subscribe(listener: (event: ToonEvent) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    async addEvent(event: Omit<ToonEvent, 'id' | 'timestamp' | 'status'>): Promise<ToonEvent> {
        const newEvent: ToonEvent = {
            ...event,
            id: `ev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            status: 'PENDING'
        };
        await localChatDB.saveEvent(newEvent);
        console.log(`[EventService] Event added: ${newEvent.type}`, newEvent);
        
        // Notify listeners for real-time alerts
        this.listeners.forEach(l => l(newEvent));

        // Trigger news generation in background if it's a major event
        if (['OPENING', 'PRODUCTION', 'QUARREL', 'FIGHT', 'COMMENT'].includes(newEvent.type)) {
            this.generateNewsForEvent(newEvent);
        }
        
        return newEvent;
    }

    async getEvents(limit: number = 50): Promise<ToonEvent[]> {
        try {
            await localChatDB.clearOldEvents(3600000); // Clear events older than 1 hour (3,600,000 ms)
        } catch (e) {
            console.error("[EventService] Failed to clear old events:", e);
        }
        return await localChatDB.getEvents(limit);
    }

    async updateEvent(event: ToonEvent): Promise<void> {
        await localChatDB.updateEvent(event);
    }

    private async generateNewsForEvent(event: ToonEvent) {
        console.log(`[EventService] Requesting news generation for: ${event.type}`);
        try {
            const res = await fetch('/api/ai/generate-news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, language: this.language })
            });
            
            if (res.ok) {
                const data = await res.json();
                // API response is { result: { title, content } }
                const news = data.result;

                if (news && news.title && news.content) {
                    const updatedEvent = {
                        ...event,
                        title: news.title,
                        content: news.content
                    };
                    await this.updateEvent(updatedEvent);
                    console.log(`[EventService] News successfully generated for ${event.type}:`, news.title);
                } else {
                    console.warn(`[EventService] AI returned empty news for ${event.type}:`, data);
                }
            } else {
                const errorText = await res.text();
                console.error(`[EventService] API error (${res.status}):`, errorText);
            }
        } catch (e) {
            console.error("[EventService] Failed to generate news for event:", e);
        }
    }

    async getRecentQuarrels(): Promise<ToonEvent[]> {
        const events = await this.getEvents(100);
        return events.filter(e => e.type === 'QUARREL' && e.status === 'PENDING');
    }
}

export const eventService = new EventService();
