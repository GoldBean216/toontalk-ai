'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';

export default function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { signInWithEmail } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await signInWithEmail(email, password);
            if (authError) throw authError;

            // Check if user is admin
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', user.id)
                    .single();

                if (profile?.is_admin) {
                    router.push('/admin');
                } else {
                    setError('Access denied. You are not an administrator.');
                    await supabase.auth.signOut();
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-white border-8 border-black rounded-[40px] w-full max-w-md p-8 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">🛠️</div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Admin Login</h1>
                    <p className="font-bold text-slate-400 mt-2 italic">ToonTalk Management Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-100 border-4 border-black p-3 rounded-2xl font-bold text-red-600 text-center animate-shake">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-black uppercase ml-2">Email Address</label>
                        <input
                            type="email"
                            required
                            placeholder="admin@toontalk.com"
                            className="w-full border-4 border-black rounded-2xl p-4 font-bold focus:bg-yellow-50 outline-none transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-black uppercase ml-2">Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full border-4 border-black rounded-2xl p-4 font-bold focus:bg-yellow-50 outline-none transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 text-xl font-black uppercase bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none active:translate-y-2 transition-all mt-4"
                    >
                        {loading ? 'Verifying...' : 'Authenticate 🔐'}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => router.push('/')}
                        className="text-sm font-black text-slate-400 hover:text-black uppercase tracking-widest border-b-2 border-transparent hover:border-black transition-all"
                    >
                        ← Back to App
                    </button>
                </div>
            </div>
        </div>
    );
}
