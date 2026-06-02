import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { table, action, match, data, gt, lt, gte, lte, neq, order, limit, single } = body;

        let query = supabase.from(table);

        if (action === 'insert') query = query.insert(data);
        else if (action === 'update') query = query.update(data);
        else if (action === 'upsert') query = query.upsert(data);
        else if (action === 'delete') query = query.delete();
        else if (action === 'select') query = query.select('*');

        if (match) {
            Object.keys(match).forEach(k => query = query.eq(k, match[k]));
        }
        if (gt) {
            gt.forEach(g => query = query.gt(g.column, g.value));
        }
        if (lt) {
            lt.forEach(l => query = query.lt(l.column, l.value));
        }
        if (gte) {
            gte.forEach(g => query = query.gte(g.column, g.value));
        }
        if (lte) {
            lte.forEach(l => query = query.lte(l.column, l.value));
        }
        if (neq) {
            neq.forEach(n => query = query.neq(n.column, n.value));
        }
        if (order) {
            query = query.order(order.column, { ascending: order.ascending });
        }
        if (limit) {
            query = query.limit(limit);
        }
        if (single) {
            query = query.single();
        }

        const { data: resultData, error } = await query;
        
        if (error) {
            return NextResponse.json({ error: error.message || 'DB Error' }, { status: 500 });
        }

        return NextResponse.json({ data: resultData });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
