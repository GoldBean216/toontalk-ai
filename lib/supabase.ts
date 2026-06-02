class ClientQueryBuilder {
    tableName: string;
    _select: string;
    _match: Record<string, any>;
    _order: any;
    _limit: number | null;
    _action: string;
    _data: any;
    _single: boolean;
    _gt: any[];
    _lt: any[];
    _gte: any[];
    _lte: any[];
    _neq: any[];

    constructor(tableName: string) {
        this.tableName = tableName;
        this._select = '*';
        this._match = {};
        this._order = null;
        this._limit = null;
        this._action = 'select';
        this._data = null;
        this._single = false;
        this._gt = [];
        this._lt = [];
        this._gte = [];
        this._lte = [];
        this._neq = [];
    }

    select(fields = '*') { this._select = fields; this._action = 'select'; return this; }
    insert(data: any) { this._data = data; this._action = 'insert'; return this; }
    update(data: any) { this._data = data; this._action = 'update'; return this; }
    upsert(data: any) { this._data = data; this._action = 'upsert'; return this; }
    delete() { this._action = 'delete'; return this; }

    eq(column: string, value: any) { this._match[column] = value; return this; }
    neq(column: string, value: any) { this._neq.push({column, value}); return this; }
    gt(column: string, value: any) { this._gt.push({column, value}); return this; }
    lt(column: string, value: any) { this._lt.push({column, value}); return this; }
    gte(column: string, value: any) { this._gte.push({column, value}); return this; }
    lte(column: string, value: any) { this._lte.push({column, value}); return this; }
    order(column: string, { ascending = true } = {}) { this._order = { column, ascending }; return this; }
    limit(n: number) { this._limit = n; return this; }
    single() { this._single = true; return this; }

    async execute() {
        try {
            const res = await fetch('/api/sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table: this.tableName,
                    action: this._action,
                    match: this._match,
                    data: this._data,
                    gt: this._gt,
                    lt: this._lt,
                    gte: this._gte,
                    lte: this._lte,
                    neq: this._neq,
                    order: this._order,
                    limit: this._limit,
                    single: this._single
                })
            });

            const json = await res.json();
            if (json.error) {
                return { data: null, error: new Error(json.error) };
            } else {
                return { data: json.data, error: null };
            }
        } catch (err: any) {
            return { data: null, error: err };
        }
    }

    then(resolve?: any, reject?: any) {
        return this.execute().then(resolve, reject);
    }
}

const getSessionFromStorage = () => {
    if (typeof window === 'undefined') return null;
    const sessionStr = localStorage.getItem('local_mock_session');
    if (sessionStr === 'logged_out') return null;
    if (sessionStr) {
        try {
            return JSON.parse(sessionStr);
        } catch (e) {
            console.error("Failed to parse local_mock_session", e);
        }
    }
    
    // Auto-login as testadmin in development environment if no session is present
    const defaultSession = {
        access_token: 'mock_token',
        user: { id: 'dc31c0eb-5c55-4ebb-84c5-c7560042f6cb', email: 'testadmin@toon.talk' }
    };
    localStorage.setItem('local_mock_session', JSON.stringify(defaultSession));
    return defaultSession;
};

const setSessionToStorage = (session: any) => {
    if (typeof window !== 'undefined') {
        if (session) localStorage.setItem('local_mock_session', JSON.stringify(session));
        else localStorage.setItem('local_mock_session', 'logged_out');
    }
};

let listeners: ((event: string, session: any) => void)[] = [];

export const supabase = {
    auth: {
        getSession: async () => {
            return { data: { session: getSessionFromStorage() } };
        },
        onAuthStateChange: (callback: (event: string, session: any) => void) => {
            listeners.push(callback);
            return {
                data: {
                    subscription: {
                        unsubscribe: () => {
                            listeners = listeners.filter(l => l !== callback);
                        }
                    }
                }
            };
        },
        signInWithPassword: async ({ email, password }: any) => {
            try {
                const nickname = email.split('@')[0];
                const res = await fetch('/api/sql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: 'profiles',
                        action: 'select',
                        match: { nickname },
                        single: true
                    })
                });
                if (!res.ok) throw new Error('Database error');
                const json = await res.json();
                const profile = json.data;
                
                if (profile && profile.id) {
                    const session = {
                        access_token: 'mock_token',
                        user: { id: profile.id, email }
                    };
                    setSessionToStorage(session);
                    listeners.forEach(l => l('SIGNED_IN', session));
                    return { error: null };
                } else {
                    return { error: { message: 'Invalid login credentials. User not found.' } };
                }
            } catch (err: any) {
                return { error: { message: err.message } };
            }
        },
        signUp: async ({ email, password }: any) => {
            try {
                const nickname = email.split('@')[0];
                const checkRes = await fetch('/api/sql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: 'profiles',
                        action: 'select',
                        match: { nickname },
                        single: true
                    })
                });
                const checkJson = await checkRes.json();
                const existing = checkJson.data;
                if (existing && existing.id) {
                    return { error: { message: 'User already exists. Please log in.' } };
                }

                const id = crypto.randomUUID();
                const insertRes = await fetch('/api/sql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table: 'profiles',
                        action: 'insert',
                        data: {
                            id,
                            nickname,
                            avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${nickname}`,
                            coins: 10,
                            subscription_tier: 'free'
                        }
                    })
                });
                if (!insertRes.ok) throw new Error('Failed to create profile');

                const session = {
                    access_token: 'mock_token',
                    user: { id, email }
                };
                setSessionToStorage(session);
                listeners.forEach(l => l('SIGNED_IN', session));
                return { error: null };
            } catch (err: any) {
                return { error: { message: err.message } };
            }
        },
        signInWithOAuth: async (options: any) => {
            const session = {
                access_token: 'mock_token',
                user: { id: 'mock_oauth_user', email: 'oauth@example.com' }
            };
            setSessionToStorage(session);
            listeners.forEach(l => l('SIGNED_IN', session));
            return { error: null };
        },
        signOut: async () => {
            setSessionToStorage(null);
            listeners.forEach(l => l('SIGNED_OUT', null));
            return { error: null };
        },
        getUser: async () => {
            const session = getSessionFromStorage();
            return { data: { user: session?.user || null }, error: null };
        }
    },
    from: (tableName: string): any => {
        return new ClientQueryBuilder(tableName);
    },
    channel: (name: string): any => ({
        on: (...args: any[]): any => ({
            subscribe: () => ({})
        })
    }),
    removeChannel: (channel: any) => {}
};
