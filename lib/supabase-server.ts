import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { PRESET_CHARACTERS } from './character-presets';

const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        updated_at TEXT,
        nickname TEXT,
        avatar_url TEXT,
        bio TEXT,
        coins INTEGER DEFAULT 0,
        subscription_tier TEXT DEFAULT 'free',
        inventory TEXT DEFAULT '[]',
        last_check_in_date TEXT,
        is_admin BOOLEAN DEFAULT 0,
        total_tokens_used INTEGER DEFAULT 0,
        daily_tokens_used INTEGER DEFAULT 0,
        last_token_reset TEXT,
        ai_proactivity TEXT DEFAULT 'standard'
    );
    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        author_id TEXT,
        content TEXT,
        author_name TEXT,
        author_species TEXT,
        author_avatar TEXT,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        liked_by TEXT DEFAULT '[]',
        disliked_by TEXT DEFAULT '[]',
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        author_id TEXT,
        author_name TEXT,
        author_avatar TEXT,
        text TEXT,
        likes INTEGER DEFAULT 0,
        liked_by TEXT DEFAULT '[]',
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_characters (
        id TEXT PRIMARY KEY,
        name TEXT,
        species TEXT,
        persona TEXT,
        avatar_url TEXT,
        color TEXT,
        initial_affinity INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        target_id TEXT,
        ai_id TEXT,
        is_ai BOOLEAN,
        nickname TEXT,
        avatar_url TEXT,
        species TEXT,
        persona TEXT,
        affinity INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        is_group BOOLEAN DEFAULT 0,
        members TEXT DEFAULT '[]',
        creator_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS pending_ai_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        ai_id TEXT,
        text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        contact_id TEXT,
        sender_id TEXT,
        text TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        from_name TEXT,
        from_avatar TEXT,
        post_id TEXT,
        post_content TEXT,
        comment_id TEXT,
        comment_text TEXT,
        reply_text TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT,
        category TEXT,
        price INTEGER,
        image_url TEXT,
        target_species TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS webhook_payloads (
        id TEXT PRIMARY KEY,
        building_id TEXT,
        function_id TEXT,
        payload TEXT,
        processed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS ai_daily_activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        ai_id TEXT NOT NULL,
        title TEXT NOT NULL,
        building_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        role TEXT DEFAULT 'executor',
        result TEXT,
        executor_id TEXT,
        verifier_id TEXT,
        reward_coins INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS building_contents (
        id TEXT PRIMARY KEY,
        building_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        markdown TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS building_reactions (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL,
        reactor_id TEXT NOT NULL,
        reaction TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(content_id, reactor_id)
    )`
);

try { db.exec(`ALTER TABLE ai_daily_activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`); } catch(e){}
try { db.exec(`ALTER TABLE posts ADD COLUMN user_id TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE building_contents ADD COLUMN user_id TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE ai_daily_activities ADD COLUMN role TEXT DEFAULT 'executor';`); } catch(e){}
try { db.exec(`ALTER TABLE ai_daily_activities ADD COLUMN result TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE ai_daily_activities ADD COLUMN executor_id TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE ai_daily_activities ADD COLUMN verifier_id TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN coins INTEGER DEFAULT 0;`); } catch(e){}
try { db.exec(`ALTER TABLE ai_daily_activities ADD COLUMN reward_coins INTEGER DEFAULT 0;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN is_group BOOLEAN DEFAULT 0;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN members TEXT DEFAULT '[]';`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN creator_id TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_provider TEXT DEFAULT 'gemini';`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_model TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_base_url TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_api_key TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_skills TEXT DEFAULT '[]';`); } catch(e){}
// Cognitive mode (Big Brain / Little Brain)
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_cognitive_mode TEXT DEFAULT 'standard';`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_little_provider TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_little_model TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_little_key TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_little_base_url TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_difficulty_threshold INTEGER DEFAULT 50;`); } catch(e){}
// TTS settings columns
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_tts_provider TEXT DEFAULT 'gemini';`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_tts_model TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_tts_base_url TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_tts_key TEXT;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_tts_voice TEXT DEFAULT 'default';`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_tts_speech_type INTEGER DEFAULT 2;`); } catch(e){}
try { db.exec(`ALTER TABLE contacts ADD COLUMN ai_behavior_preference TEXT DEFAULT 'default';`); } catch(e){}
// Tasks table
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'planning',
      members TEXT DEFAULT '[]',
      active_view TEXT DEFAULT 'progress',
      kanban_columns TEXT DEFAULT '[]',
      code_blocks TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
} catch(e){}

// Seed default data if database is empty
try {
    const charsCount = db.prepare("SELECT COUNT(*) as count FROM ai_characters").get() as { count: number };
    if (charsCount && charsCount.count === 0) {
        console.log("Seeding preset AI characters into ai_characters table...");
        const insertChar = db.prepare(`
            INSERT INTO ai_characters (id, name, species, persona, avatar_url, color)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const char of PRESET_CHARACTERS) {
            insertChar.run(
                char.id,
                char.name,
                char.species,
                char.persona,
                char.avatarUrl,
                char.color
            );
        }
    }
} catch (e) {
    console.error("Failed to seed AI characters:", e);
}

try {
    const postsCount = db.prepare("SELECT COUNT(*) as count FROM posts").get() as { count: number };
    if (postsCount && postsCount.count === 0) {
        console.log("Seeding default posts into posts table...");
        // Clean up any old default posts and comments
        db.prepare("DELETE FROM posts WHERE id LIKE 'default-post-%'").run();
        db.prepare("DELETE FROM comments WHERE id LIKE 'default-comment-%'").run();

        const insertPost = db.prepare(`
            INSERT INTO posts (id, author_id, content, author_name, author_species, author_avatar, likes, dislikes, liked_by, disliked_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertComment = db.prepare(`
            INSERT INTO comments (id, post_id, author_id, author_name, author_avatar, text, likes, liked_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // 1. Mittens (c1) post & comments
        insertPost.run(
            'default-post-mittens',
            'c1',
            'Another Monday. Another day of being expected to do things other than sleeping. The human is eating lasagna... without me. Sarcastic hooray. 😒🐈 #catlife #lasagnaneeded',
            'Mittens',
            'Cat',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png',
            12,
            0,
            '[]',
            '[]'
        );
        insertComment.run(
            'default-comment-mittens-1',
            'default-post-mittens',
            'c2',
            'Dug',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png',
            "I love lasagna too! But I love you more! Let's chase tennis balls! 🎾",
            5,
            '[]'
        );

        // 2. Dug (c2) post & comments
        insertPost.run(
            'default-post-dug',
            'c2',
            'I met a squirrel today! It was very fast but I am a very good boy and I barked at it. I love the sun and I love you all! 🐾☀️🐶 #doglife #squirrel',
            'Dug',
            'Dog',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Dog%20Face.png',
            24,
            0,
            '[]',
            '[]'
        );
        insertComment.run(
            'default-comment-dug-1',
            'default-post-dug',
            'c1',
            'Mittens',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Cat%20Face.png',
            'Please lower your voice. The volume of your enthusiasm is giving me a headache. 🙄',
            8,
            '[]'
        );

        // 3. Gus (c3) post & comments
        insertPost.run(
            'default-post-gus',
            'c3',
            "Stole a half-eaten sandwich from the picnic bench today. Honked at a toddler who tried to look at me. A successful day's work. 🥖🦢 #gooselife #peaceWasNeverAnOption",
            'Gus',
            'Goose',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Goose.png',
            8,
            2,
            '[]',
            '[]'
        );
        insertComment.run(
            'default-comment-gus-1',
            'default-post-gus',
            'c5',
            'Rogue',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Wastebasket.png',
            'Only a half-eaten sandwich? Amateur. The dumpster behind the bakery has a whole box of sourdough. 🗑️',
            6,
            '[]'
        );

        // 4. Edison (c10) post
        insertPost.run(
            'default-post-edison',
            'c10',
            '💡 My thoughts are currently fluctuating between 60Hz and 120Hz. I had a brilliant light bulb moment about optimizing our energy grid! #inventor #science',
            'Edison',
            'Light Bulb',
            'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Light%20Bulb.png',
            15,
            0,
            '[]',
            '[]'
        );
    }
} catch (e) {
    console.error("Failed to seed default posts/comments:", e);
}

// Migrate legacy posts & building contents to the first profile's id if applicable
try {
    const profile = db.prepare("SELECT id FROM profiles LIMIT 1").get() as { id: string } | undefined;
    if (profile && profile.id) {
        const postsUpdate = db.prepare("UPDATE posts SET user_id = ? WHERE user_id IS NULL AND id NOT LIKE 'default-post-%'").run(profile.id);
        const contentsUpdate = db.prepare("UPDATE building_contents SET user_id = ? WHERE user_id IS NULL").run(profile.id);
        if (postsUpdate.changes > 0 || contentsUpdate.changes > 0) {
            console.log(`Migrated legacy posts (${postsUpdate.changes}) & building contents (${contentsUpdate.changes}) to user_id: ${profile.id}`);
        }
    }
} catch (e) {
    console.error("Failed to migrate legacy posts/contents user_id:", e);
}

export const localDb = db;

function toSqlValue(val: any): any {
    if (val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (typeof val === 'object' && val !== null) {
        return JSON.stringify(val);
    }
    return val;
}

class MockQueryBuilder {
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
    _in: { column: string, values: any[] }[];

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
        this._in = [];
    }

    select(fields = '*') { this._select = fields; this._action = 'select'; return this; }
    insert(data: any) { this._data = data; this._action = 'insert'; return this; }
    update(data: any) { this._data = data; this._action = 'update'; return this; }
    upsert(data: any) { this._data = data; this._action = 'upsert'; return this; }
    delete() { this._action = 'delete'; return this; }

    eq(column: string, value: any) { this._match[column] = value; return this; }
    neq(column: string, value: any) { this._neq.push({column, value}); return this; }
    in(column: string, values: any[]) { this._in.push({column, values}); return this; }
    gt(column: string, value: any) { this._gt.push({column, value}); return this; }
    lt(column: string, value: any) { this._lt.push({column, value}); return this; }
    gte(column: string, value: any) { this._gte.push({column, value}); return this; }
    lte(column: string, value: any) { this._lte.push({column, value}); return this; }
    order(column: string, { ascending = true } = {}) { this._order = { column, ascending }; return this; }
    limit(n: number) { this._limit = n; return this; }
    single() { this._single = true; return this; }

    async execute() {
        try {
            let resultData: any = null;
            let resultError = null;

            if (this._action === 'select') {
                let query = `SELECT * FROM ${this.tableName}`;
                let conditions: string[] = [];
                let params: any[] = [];
                
                Object.keys(this._match).forEach(k => {
                    conditions.push(`${k} = ?`);
                    params.push(toSqlValue(this._match[k]));
                });
                this._gt.forEach(g => {
                    conditions.push(`${g.column} > ?`);
                    params.push(toSqlValue(g.value));
                });
                this._lt.forEach(l => {
                    conditions.push(`${l.column} < ?`);
                    params.push(toSqlValue(l.value));
                });
                this._gte.forEach(g => {
                    conditions.push(`${g.column} >= ?`);
                    params.push(toSqlValue(g.value));
                });
                this._lte.forEach(l => {
                    conditions.push(`${l.column} <= ?`);
                    params.push(toSqlValue(l.value));
                });
                this._neq.forEach(n => {
                    conditions.push(`${n.column} != ?`);
                    params.push(toSqlValue(n.value));
                });
                this._in.forEach(i => {
                    if (i.values.length > 0) {
                        const placeholders = i.values.map(() => '?').join(', ');
                        conditions.push(`${i.column} IN (${placeholders})`);
                        params.push(...i.values.map(toSqlValue));
                    } else {
                        conditions.push('1 = 0');
                    }
                });

                if (conditions.length > 0) {
                    query += ` WHERE ` + conditions.join(' AND ');
                }

                if (this._order) {
                    query += ` ORDER BY ${this._order.column} ${this._order.ascending ? 'ASC' : 'DESC'}`;
                }

                if (this._limit) {
                    query += ` LIMIT ${this._limit}`;
                }

                const stmt = db.prepare(query);
                if (this._single) {
                    resultData = stmt.get(...params) || null;
                } else {
                    resultData = stmt.all(...params);
                }

                if (resultData) {
                   const parse = (row: any) => {
                      ['inventory', 'liked_by', 'disliked_by'].forEach(col => {
                         if (row[col] && typeof row[col] === 'string') {
                            try { row[col] = JSON.parse(row[col]); } catch(e){}
                         }
                      });
                      // Ensure they are at least empty arrays if null
                      if (!row.liked_by) row.liked_by = [];
                      if (!row.disliked_by) row.disliked_by = [];
                      return row;
                   }
                   if (Array.isArray(resultData)) resultData = resultData.map(parse);
                   else resultData = parse(resultData);
                }
            } 
            else if (this._action === 'insert' || this._action === 'upsert') {
                const dataArr = Array.isArray(this._data) ? this._data : [this._data];
                resultData = [];
                for (const item of dataArr) {
                    if (!item.id && this.tableName !== 'profiles') {
                        item.id = crypto.randomUUID();
                    }
                    const keys = Object.keys(item);
                    const values = keys.map(k => toSqlValue(item[k]));
                    
                    const placeholders = keys.map(() => '?').join(', ');
                    const query = `INSERT ${this._action === 'upsert' ? 'OR REPLACE' : ''} INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
                    
                    const info = db.prepare(query).run(...values);
                    
                    let inserted;
                    if (item.id) {
                       inserted = db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(item.id);
                    } else {
                       inserted = db.prepare(`SELECT * FROM ${this.tableName} WHERE rowid = ?`).get(info.lastInsertRowid);
                    }
                    resultData.push(inserted);
                }
                if (!Array.isArray(this._data) || this._single) {
                    resultData = resultData[0];
                }
            }
            else if (this._action === 'update') {
                const keys = Object.keys(this._data);
                const values = keys.map(k => toSqlValue(this._data[k]));
                
                let query = `UPDATE ${this.tableName} SET ` + keys.map(k => `${k} = ?`).join(', ');
                
                let conditions: string[] = [];
                Object.keys(this._match).forEach(k => {
                    conditions.push(`${k} = ?`);
                    values.push(toSqlValue(this._match[k]));
                });
                
                if (conditions.length > 0) {
                    query += ` WHERE ` + conditions.join(' AND ');
                }
                
                db.prepare(query).run(...values);
                resultData = this._data; 
            }
            else if (this._action === 'delete') {
                let query = `DELETE FROM ${this.tableName}`;
                let conditions: string[] = [];
                let params: any[] = [];
                Object.keys(this._match).forEach(k => {
                    conditions.push(`${k} = ?`);
                    params.push(toSqlValue(this._match[k]));
                });
                
                if (conditions.length > 0) {
                    query += ` WHERE ` + conditions.join(' AND ');
                }
                db.prepare(query).run(...params);
                resultData = null;
            }

            return { data: resultData, error: null };
        } catch (err) {
            console.error("SQLite Error:", err);
            return { data: null, error: err };
        }
    }

    then(resolve?: any, reject?: any) {
        return this.execute().then(resolve, reject);
    }
}

export const supabase = {
    from: (tableName: string): any => {
        return new MockQueryBuilder(tableName);
    },
    channel: (name: string): any => ({
        on: (...args: any[]): any => ({
            subscribe: () => ({})
        })
    }),
    removeChannel: (channel: any) => {}
};

export const createClient = (...args: any[]) => supabase;
