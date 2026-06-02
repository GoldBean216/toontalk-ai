import React, { useState } from 'react';
import { Button } from './Button';
import { useAuth } from '../lib/auth-context';

interface LoginScreenProps {
  onLogin: () => void; // Kept for prop compatibility
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const auth = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      let result;

      if (isLogin) {
        result = await auth.signInWithEmail(email, password);
      } else {
        result = await auth.signUpWithEmail(email, password);
      }

      if (result.error) {
        setErrorMessage(result.error.message || 'Authentication failed');
        setIsLoading(false);
      } else {
        if (!isLogin) {
          setErrorMessage('Success! You are now signed in.');
          // Optional: Clear form or redirect
          setEmail('');
          setPassword('');
        }
        // Success for login - AuthContext will handle session update
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await auth.signInWithGoogle();

      if (result.error) {
        setErrorMessage(result.error.message || 'Social login failed');
        setIsLoading(false);
      }
      // OAuth will redirect, so we don't reset loading state
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-yellow-300 flex items-center justify-center p-4 font-fredoka overflow-y-auto">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-md shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] p-8 relative overflow-hidden">

        {/* Decor */}
        <div className="absolute top-[-40px] right-[-40px] w-32 h-32 bg-blue-400 rounded-full border-4 border-black z-0"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-20 h-20 bg-pink-400 rounded-full border-4 border-black z-0"></div>

        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-green-400 rounded-3xl border-4 border-black mx-auto mb-6 flex items-center justify-center text-5xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white">
            T
          </div>
          <h1 className="text-4xl font-black mb-2 uppercase tracking-wider">ToonTalk</h1>
          <p className="font-bold text-gray-500 mb-8">Chat with Everything.</p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border-2 border-red-400 rounded-lg text-red-700 text-sm font-bold">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3 animate-fadeIn">
            {/* 
            <button
              onClick={() => handleSocialLogin()}
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3 rounded-xl border-4 border-black flex items-center justify-center gap-2 hover:bg-gray-50 transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className="text-red-500 font-black text-xl">G</span> Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-gray-200"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500 font-bold">Or</span></div>
            </div> 
            */}

            <form onSubmit={handleAuth} className="space-y-4 text-left">
              <div>
                <label className="block font-black mb-1 ml-1 text-sm uppercase tracking-wide text-gray-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-4 border-black rounded-xl p-3 font-bold focus:outline-none focus:ring-4 ring-yellow-200"
                  placeholder="hello@toon.talk"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block font-black mb-1 ml-1 text-sm uppercase tracking-wide text-gray-600">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-4 border-black rounded-xl p-3 font-bold focus:outline-none focus:ring-4 ring-yellow-200"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  minLength={6}
                />
                {!isLogin && (
                  <p className="text-xs text-gray-500 mt-1 ml-1">Minimum 6 characters</p>
                )}
              </div>

              <div className="pt-2">
                <Button fullWidth type="submit" className="text-xl py-4" disabled={isLoading}>
                  {isLoading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
                </Button>
              </div>
            </form>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrorMessage('');
                }}
                className="text-blue-500 font-black hover:underline text-sm"
                disabled={isLoading}
              >
                {isLogin ? "Need an account? Sign Up" : "Have an account? Log In"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
