
import React from 'react';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface RechargeModalProps {
  onClose: () => void;
  onRecharge: (amount: number, cost: number) => void;
  isFirstTime: boolean;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({ onClose, onRecharge, isFirstTime }) => {
  const { t } = useLanguage();
  const packages = [
    { coins: 100, cost: 1, label: '$1.00' },
    { coins: 600, cost: 5, label: '$5.00' },
    { coins: 1200, cost: 10, label: '$10.00' },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-yellow-400 p-4 border-b-4 border-black flex justify-between items-center">
           <h2 className="font-black text-xl uppercase tracking-wider">{t.rechargeTitle || 'Recharge TT'}</h2>
           <button onClick={onClose} className="font-bold text-xl hover:bg-white/20 px-2 rounded">✕</button>
        </div>

        <div className="p-6 bg-yellow-50">
           <div className="text-center mb-6">
              <div className="text-5xl mb-2">💎</div>
              <h3 className="font-black text-2xl">{t.getMoreCoinsRecharge || 'Get More Coins'}</h3>
              {isFirstTime && (
                  <div className="bg-red-500 text-white font-black text-sm inline-block px-3 py-1 rounded-full border-2 border-black mt-2 animate-bounce">
                      {t.firstTimeBonus || '+300 TT FIRST TIME BONUS!'}
                  </div>
              )}
           </div>

           <div className="space-y-3">
              {packages.map((pkg, idx) => (
                  <button
                    key={idx}
                    onClick={() => onRecharge(pkg.coins, pkg.cost)}
                    className="w-full bg-white border-4 border-black rounded-2xl p-4 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 active:translate-y-1 active:shadow-none transition-all"
                  >
                      <div className="text-left">
                          <span className="block font-black text-xl">{pkg.coins} TT</span>
                          {isFirstTime && <span className="text-xs font-bold text-red-500">+300 {t.bonus || 'Bonus'}</span>}
                      </div>
                      <span className="bg-green-400 text-white font-black px-3 py-1 rounded-lg border-2 border-black text-sm">
                          {pkg.label}
                      </span>
                  </button>
              ))}
           </div>

           <p className="text-center text-xs font-bold text-gray-400 mt-6">
               {t.securePayment || 'Secure payment processed by ToonPay™'}
           </p>
         </div>
      </div>
    </div>
  );
};
