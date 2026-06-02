
import React from 'react';
import { Product } from '../types';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface MyItemsProps {
    inventory: string[];
    onBack: () => void;
    products?: Product[];
}

export const MyItems: React.FC<MyItemsProps> = ({ inventory, onBack, products }) => {
    const { t } = useLanguage();
    // Map IDs back to full product objects
    const myProducts = inventory.map(id => (products || []).find(p => p.id === id)).filter(Boolean);

    return (
        <div className="flex flex-col h-full bg-blue-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center shadow-md">
                <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all" aria-label={t.mapBack || "Back"}>
                    ←
                </button>
                <h1 className="text-2xl font-black tracking-wider uppercase">{t.myItemsTitle || 'My Items'}</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {myProducts.length === 0 ? (
                    <div className="text-center mt-20 opacity-50">
                        <div className="text-6xl mb-4">📦</div>
                        <p className="font-bold text-xl">{t.emptyInventory || 'Empty Inventory'}</p>
                        <p>{t.goShoppingDesc || 'Go to the Mall to buy stuff!'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {myProducts.map((item, idx) => (
                            <div key={`${item!.id}-${idx}`} className="bg-white border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center">
                                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center p-2">
                                    <img src={item!.imageUrl} alt={item!.name} className="w-full h-full object-contain" />
                                </div>
                                <h3 className="font-black text-center leading-tight text-[10px] w-full truncate">{item!.name}</h3>
                                <span className="text-[9px] text-gray-400 font-bold uppercase mt-1">{item!.category}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
