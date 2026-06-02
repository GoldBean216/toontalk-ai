import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*');

        if (error) throw error;

        const mappedProducts = products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            imageUrl: p.image_url,
            targetSpecies: p.target_species
        }));

        return NextResponse.json(mappedProducts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, productIds, isPurchase, product } = body;

        // 1. Administrative: Create product
        if (!isPurchase && product) {
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    image_url: product.imageUrl,
                    target_species: product.targetSpecies
                }])
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // 2. User: Purchase products
        if (!userId || !productIds || !Array.isArray(productIds)) {
            return NextResponse.json({ error: 'Missing userId or productIds' }, { status: 400 });
        }

        const { data: products } = await supabase.from('products').select('*').in('id', productIds);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

        if (!products || !profile) return NextResponse.json({ error: 'Data not found' }, { status: 404 });

        const totalCost = products.reduce((sum: number, p: any) => sum + p.price, 0);

        if (profile.coins < totalCost) {
            return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });
        }

        const newCoins = profile.coins - totalCost;
        let currentInventory = profile.inventory || [];
        if (typeof currentInventory === 'string') {
            try {
                currentInventory = JSON.parse(currentInventory);
            } catch (e) {
                currentInventory = [];
            }
        }
        const newInventory = Array.from(new Set([...currentInventory, ...productIds]));

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                inventory: newInventory,
                coins: newCoins
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, coins: newCoins, inventory: newInventory, profile: { coins: newCoins, inventory: newInventory } });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const product = await req.json();
        if (!product.id) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });

        const { data, error } = await supabase
            .from('products')
            .update({
                name: product.name,
                category: product.category,
                price: product.price,
                image_url: product.imageUrl,
                target_species: product.targetSpecies
            })
            .eq('id', product.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
