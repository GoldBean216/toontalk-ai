import { Message } from '../types';

const getCurrentUserId = (): string | undefined => {
    if (typeof window !== 'undefined') {
        const sessionStr = localStorage.getItem('local_mock_session');
        if (sessionStr && sessionStr !== 'logged_out') {
            try {
                return JSON.parse(sessionStr)?.user?.id;
            } catch (e) {}
        }
    }
    return undefined;
};

/**
 * LocalChatDB: A persistent local storage for chat messages using IndexedDB.
 * This acts as the "Local SQLite" for the web application.
 */
class LocalChatDB {
    private dbName = 'toontalk_chat_db';
    private storeName = 'messages';
    private skillStoreName = 'skills';
    private charStoreName = 'character_templates';
    private eventStoreName = 'events';
    private buildingStoreName = 'buildings';
    private version = 6; // Bumped version for buildings store
    private db: IDBDatabase | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initDB();
        }
    }

    private initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                // Messages Store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    store.createIndex('contactId', 'contactId', { unique: false });
                    store.createIndex('userId', 'userId', { unique: false });
                    store.createIndex('userId_contactId', ['userId', 'contactId'], { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Skills Store
                if (!db.objectStoreNames.contains(this.skillStoreName)) {
                    db.createObjectStore(this.skillStoreName, { keyPath: 'id' });
                }

                // Character Templates Store
                if (!db.objectStoreNames.contains(this.charStoreName)) {
                    db.createObjectStore(this.charStoreName, { keyPath: 'id' });
                }

                // Events Store
                if (!db.objectStoreNames.contains(this.eventStoreName)) {
                    const store = db.createObjectStore(this.eventStoreName, { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('status', 'status', { unique: false });
                }

                // Buildings Store
                if (!db.objectStoreNames.contains(this.buildingStoreName)) {
                    db.createObjectStore(this.buildingStoreName, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve(this.db!);
            };
            request.onerror = (event: any) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    private async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;
        return await this.initDB();
    }

    // --- Skills Management ---

    async saveSkill(skill: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.skillStoreName], 'readwrite');
            const store = transaction.objectStore(this.skillStoreName);
            const request = store.put(skill);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async deleteSkill(skillId: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.skillStoreName], 'readwrite');
            const store = transaction.objectStore(this.skillStoreName);
            const request = store.delete(skillId);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async getInstalledSkills(): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.skillStoreName], 'readonly');
            const store = transaction.objectStore(this.skillStoreName);
            const request = store.getAll();
            request.onsuccess = (event: any) => resolve(event.target.result);
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    // --- Character Templates Management ---

    async saveCharacterTemplate(template: any): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.charStoreName], 'readwrite');
            const store = transaction.objectStore(this.charStoreName);
            const request = store.put(template);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async deleteCharacterTemplate(id: string): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.charStoreName], 'readwrite');
            const store = transaction.objectStore(this.charStoreName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async getCharacterTemplates(): Promise<any[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.charStoreName], 'readonly');
            const store = transaction.objectStore(this.charStoreName);
            const request = store.getAll();
            request.onsuccess = (event: any) => resolve(event.target.result);
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    // --- Messages Management ---

    async saveMessage(userId: string, contactId: string, message: Message): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const data = {
                ...message,
                userId,    // Associate message with current user
                contactId  // Add contactId for indexing
            };
            const request = store.put(data);

            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async getMessages(userId: string, contactId: string): Promise<Message[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);

            // Use composite index to get messages for specific user AND contact
            const index = store.index('userId_contactId');
            const request = index.getAll([userId, contactId]);

            request.onsuccess = (event: any) => {
                const results = event.target.result;
                // Sort by timestamp
                resolve(results.sort((a: any, b: any) => a.timestamp - b.timestamp));
            };
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async clearMessages(userId: string, contactId: string): Promise<void> {
        const db = await this.getDB();
        const messages = await this.getMessages(userId, contactId);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            messages.forEach(m => store.delete(m.id));
            transaction.oncomplete = () => resolve();
            transaction.onerror = (event: any) => reject(event.target.error);
        });
    }

    async getAllChatContactIds(userId: string): Promise<string[]> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('userId_contactId');

            // Open cursor for this user only
            const keyRange = IDBKeyRange.bound([userId, ''], [userId, '\uffff']);
            const request = index.openKeyCursor(keyRange, 'nextunique');
            const ids: string[] = [];

            request.onsuccess = (event: any) => {
                const cursor = event.target.result;
                if (cursor) {
                    // cursor.key is [userId, contactId]
                    ids.push(cursor.key[1]);
                    cursor.continue();
                } else {
                    resolve(ids);
                }
            };
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    // --- Events Management ---

    async saveEvent(event: any, userId?: string): Promise<void> {
        const effectiveUserId = userId || getCurrentUserId();
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.eventStoreName], 'readwrite');
            const store = transaction.objectStore(this.eventStoreName);
            const dataToSave = effectiveUserId ? {
                ...event,
                id: `${effectiveUserId}_${event.id}`,
                realId: event.id,
                userId: effectiveUserId
            } : event;
            const request = store.put(dataToSave);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async getEvents(limit: number = 50, userId?: string): Promise<any[]> {
        const effectiveUserId = userId || getCurrentUserId();
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.eventStoreName], 'readonly');
            const store = transaction.objectStore(this.eventStoreName);
            const index = store.index('timestamp');
            const request = index.openCursor(null, 'prev'); // Most recent first
            const results: any[] = [];
            let count = 0;

            request.onsuccess = (event: any) => {
                const cursor = event.target.result;
                if (cursor) {
                    const val = cursor.value;
                    if (!effectiveUserId || val.userId === effectiveUserId) {
                        const restored = effectiveUserId ? {
                            ...val,
                            id: val.realId || val.id
                        } : val;
                        results.push(restored);
                        count++;
                    }
                    if (count < limit) {
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                } else {
                    resolve(results);
                }
            };
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async updateEvent(event: any, userId?: string): Promise<void> {
        return this.saveEvent(event, userId);
    }

    async clearOldEvents(olderThanMs: number, userId?: string): Promise<void> {
        const effectiveUserId = userId || getCurrentUserId();
        const db = await this.getDB();
        const cutoff = Date.now() - olderThanMs;
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.eventStoreName], 'readwrite');
            const store = transaction.objectStore(this.eventStoreName);
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(cutoff);
            const request = index.openCursor(range);

            request.onsuccess = (event: any) => {
                const cursor = event.target.result;
                if (cursor) {
                    const val = cursor.value;
                    if (!effectiveUserId || val.userId === effectiveUserId) {
                        store.delete(cursor.primaryKey);
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    // --- Buildings Management ---

    async saveBuilding(building: any, userId?: string): Promise<void> {
        const effectiveUserId = userId || getCurrentUserId();
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.buildingStoreName], 'readwrite');
            const store = transaction.objectStore(this.buildingStoreName);
            const dataToSave = effectiveUserId ? {
                ...building,
                id: `${effectiveUserId}_${building.id}`,
                realId: building.id,
                userId: effectiveUserId
            } : building;
            const request = store.put(dataToSave);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async getBuildings(userId?: string): Promise<any[]> {
        const effectiveUserId = userId || getCurrentUserId();
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.buildingStoreName], 'readonly');
            const store = transaction.objectStore(this.buildingStoreName);
            const request = store.getAll();
            request.onsuccess = (event: any) => {
                const results = event.target.result || [];
                if (effectiveUserId) {
                    const filtered = results
                        .filter((item: any) => item.userId === effectiveUserId)
                        .map((item: any) => ({
                            ...item,
                            id: item.realId || item.id
                        }));
                    resolve(filtered);
                } else {
                    resolve(results);
                }
            };
            request.onerror = (event: any) => reject(event.target.error);
        });
    }

    async deleteBuilding(id: string, userId?: string): Promise<void> {
        const effectiveUserId = userId || getCurrentUserId();
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.buildingStoreName], 'readwrite');
            const store = transaction.objectStore(this.buildingStoreName);
            const key = effectiveUserId ? `${effectiveUserId}_${id}` : id;
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event: any) => reject(event.target.error);
        });
    }
}

export const localChatDB = new LocalChatDB();

