import React from 'react';
import { SubscriptionTier } from '../types';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface SubscriptionModalProps {
  currentTier: SubscriptionTier;
  onClose: () => void;
  onSubscribe: (tier: SubscriptionTier) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ currentTier, onClose, onSubscribe }) => {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn overflow-y-auto">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col my-4">
        
        {/* Header */}
        <div className="p-4 border-b-4 border-black flex justify-between items-center bg-yellow-300 rounded-t-2xl">
           <h2 className="font-black text-2xl uppercase tracking-wider">{t.subscriptionTitle || 'ToonTalk Store'}</h2>
           <button onClick={onClose} className="font-bold text-xl hover:bg-white/50 rounded px-2 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-4">
           <div className="text-center mb-6">
              <h3 className="text-3xl font-black mb-2">{t.upgradeYourChat || 'Upgrade your Chat!'}</h3>
              <p className="font-bold text-gray-500">{t.getMoreCoins || 'Get more TT Coins daily and unlock exclusive features.'}</p>
           </div>

           {/* Free Tier */}
           <div className={`border-4 border-black rounded-2xl p-4 ${currentTier === 'free' ? 'bg-gray-100 opacity-60' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-2">
                 <h4 className="font-black text-xl">{t.freeStarter || 'Free Starter'}</h4>
                 <span className="font-bold bg-gray-200 px-2 rounded text-sm">$0 / {t.month || 'month'}</span>
              </div>
              <ul className="text-sm font-bold text-gray-600 list-disc pl-5 mb-4">
                 <li>{t.freeStarterBenefits1 || 'Daily Bonus: 10 TT'}</li>
                 <li>{t.freeStarterBenefits2 || 'Basic Character Chats'}</li>
              </ul>
              {currentTier === 'free' ? (
                 <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-2 rounded-xl border-2 border-gray-400">{t.currentPlan || 'Current Plan'}</button>
              ) : (
                  <Button variant="secondary" fullWidth onClick={() => onSubscribe('free')}>{t.downgrade || 'Downgrade'}</Button>
              )}
           </div>

           {/* Premium Tier */}
           <div className={`border-4 border-black rounded-2xl p-4 relative overflow-hidden ${currentTier === 'premium' ? 'bg-blue-50 ring-4 ring-blue-300' : 'bg-blue-50'}`}>
              {currentTier === 'premium' && <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-bl-xl border-b-2 border-l-2 border-black">{t.active || 'ACTIVE'}</div>}
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <h4 className="font-black text-xl">{t.premium || 'Premium'}</h4>
                    <p className="text-xs font-bold text-blue-500">{t.mostPopular || 'Most Popular'}</p>
                 </div>
                 <div className="text-right">
                    <span className="block font-black text-lg">$0.00 <span className="text-xs font-normal text-gray-500">/ {t.month || 'month'}</span></span>
                    <span className="block text-xs font-bold text-green-500">{t.freeUpgrade || 'Free Upgrade'}</span>
                 </div>
              </div>
              <ul className="text-sm font-bold text-gray-600 list-disc pl-5 mb-4 space-y-1">
                 <li>{t.premiumBenefits1 || 'Daily Bonus: 200 TT'}</li>
                 <li>{t.premiumBenefits2 || 'Faster AI Responses'}</li>
                 <li>{t.premiumBenefits3 || 'Exclusive Avatar Frames'}</li>
              </ul>
              {currentTier === 'premium' ? (
                 <button disabled className="w-full bg-blue-200 text-blue-700 font-bold py-2 rounded-xl border-2 border-blue-300">{t.currentPlan || 'Current Plan'}</button>
              ) : (
                  <Button 
                    className="bg-blue-400 hover:bg-blue-500 text-white" 
                    fullWidth 
                    onClick={() => onSubscribe('premium')}
                  >
                    {t.upgradeNow || 'Upgrade Now'}
                  </Button>
              )}
           </div>

           {/* Premium+ Tier */}
           <div className={`border-4 border-black rounded-2xl p-4 relative overflow-hidden ${currentTier === 'premium_plus' ? 'bg-purple-50 ring-4 ring-purple-300' : 'bg-purple-50'}`}>
              {currentTier === 'premium_plus' && <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-bl-xl border-b-2 border-l-2 border-black">{t.active || 'ACTIVE'}</div>}
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <h4 className="font-black text-xl text-purple-600">{t.premiumPlus || 'Premium+'}</h4>
                    <p className="text-xs font-bold text-purple-400">{t.forPowerUsers || 'For Power Users'}</p>
                 </div>
                 <div className="text-right">
                    <span className="block font-black text-lg">$0.00 <span className="text-xs font-normal text-gray-500">/ {t.month || 'month'}</span></span>
                    <span className="block text-xs font-bold text-green-500">{t.freeUpgrade || 'Free Upgrade'}</span>
                 </div>
              </div>
              <ul className="text-sm font-bold text-gray-600 list-disc pl-5 mb-4 space-y-1">
                 <li>{t.premiumPlusBenefits1 || 'Daily Bonus: 1000 TT'}</li>
                 <li>{t.premiumPlusBenefits2 || 'Priority Support'}</li>
                 <li>{t.premiumPlusBenefits3 || 'Access to Beta Features (Voice Call)'}</li>
              </ul>
              {currentTier === 'premium_plus' ? (
                 <button disabled className="w-full bg-purple-200 text-purple-700 font-bold py-2 rounded-xl border-2 border-purple-300">{t.currentPlan || 'Current Plan'}</button>
              ) : (
                  <Button 
                    className="bg-purple-500 hover:bg-purple-600 text-white" 
                    fullWidth 
                    onClick={() => onSubscribe('premium_plus')}
                  >
                    {t.goUltimate || 'Go Ultimate'}
                  </Button>
              )}
           </div>

        </div>
      </div>
    </div>
  );
};
