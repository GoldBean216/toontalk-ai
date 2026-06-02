'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { AdminMall } from '@/components/AdminMall';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';

export default function AdminDashboard() {
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdmin = async () => {
            if (authLoading) return;

            if (!user) {
                router.push('/admin/login');
                return;
            }

            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (profile?.is_admin) {
                    setIsAdmin(true);
                } else {
                    await signOut();
                    router.push('/admin/login');
                }
            } catch (err) {
                console.error("Admin check failed", err);
                router.push('/admin/login');
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [user, authLoading, router, signOut]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-6xl animate-bounce">🐱</div>
                <p className="ml-4 text-white font-black uppercase tracking-widest">Checking Clearance...</p>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden">
            <div className="flex-1">
                <AdminMall onBack={() => {
                    if (confirm('Exit Administration?')) {
                        router.push('/');
                    }
                }} />
            </div>

            {/* Minimalist Admin Logout Footer */}
            <div className="bg-slate-900 p-2 flex justify-between items-center px-6">
                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Admin Session Active: {user?.email}
                </div>
                <button
                    onClick={async () => {
                        await signOut();
                        router.push('/admin/login');
                    }}
                    className="text-white text-xs font-black uppercase bg-red-600 px-3 py-1 rounded-lg border-2 border-black hover:bg-red-700 transition-colors"
                >
                    Guard Logout 🚪
                </button>
            </div>
        </div>
    );
}
