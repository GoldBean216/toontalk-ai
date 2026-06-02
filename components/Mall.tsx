
import React, { useState } from 'react';
import { Product, ProductCategory } from '../types';
import { Button } from './Button';
import { useLanguage } from '../lib/language-context';

interface MallProps {
    onBack: () => void;
    userCoins: number;
    onPurchase: (items: Product[]) => Promise<boolean>; // Returns true if successful
}

// Fallback products (will be replaced by DB fetch)
export const INITIAL_PRODUCTS: Product[] = [
    { id: 'f1', name: 'Cat Food', category: 'food', price: 3, imageUrl: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Canned%20Food.png', targetSpecies: 'Cat' },
];

export const Mall: React.FC<MallProps> = ({ onBack, userCoins, onPurchase }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<ProductCategory>('food');
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<Product[]>([]);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);

    React.useEffect(() => {
        fetch('/api/mall')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setProducts(data);
            })
            .finally(() => setIsLoading(false));
    }, []);

    const categories: { id: ProductCategory; label: string; icon: string }[] = [
        { id: 'food', label: t.catFood || 'Food', icon: '🍔' },
        { id: 'dressup', label: t.catStyle || 'Style', icon: '🎀' },
        { id: 'toy', label: t.catToys || 'Toys', icon: '🧸' },
        { id: 'furniture', label: t.catHome || 'Home', icon: '🛋️' },
    ];

    const filteredProducts = products.filter(p =>
        p.category === activeTab &&
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCost = cart.reduce((sum, item) => sum + item.price, 0);

    const addToCart = (product: Product) => {
        setCart(prev => [...prev, product]);
    };

    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    const handleCheckout = async () => {
        if (isPurchasing) return;
        setIsPurchasing(true);
        try {
            const success = await onPurchase(cart);
            if (success) {
                setCart([]);
                setIsCheckoutOpen(false);
                alert(t.checkoutSuccess || "Purchase successful! Check your profile > My Items.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsPurchasing(false);
        }
    };

    const forSpeciesLabel = t.navMe === '个人中心' ? '适用于: ' : t.navMe === 'マイページ' ? '対象: ' : t.navMe === 'Perfil' ? 'Para: ' : t.navMe === 'Me' ? 'For: ' : 'Pour : ';
    const removeLabel = t.navMe === '个人中心' ? '移除' : t.navMe === 'マイページ' ? '削除' : t.navMe === 'Perfil' ? 'Eliminar' : t.navMe === 'Me' ? 'Remove' : 'Retirer';

    return (
        <div className="flex flex-col h-full bg-cyan-50 overflow-hidden relative">
            {/* Header */}
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all" aria-label={t.mapBack || "Back"}>
                        ←
                    </button>
                    <h1 className="text-2xl font-black tracking-wider uppercase">{t.toonMallTitle || 'Toon Mall'}</h1>
                </div>
                <div className="bg-yellow-300 px-3 py-1 rounded-full border-2 border-black font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    💰 {userCoins} TT
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Tabs */}
                <div className="p-4 bg-white border-b-4 border-black">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t.searchPlaceholder || "Search..."}
                        className="w-full border-4 border-black rounded-xl p-2 mb-3 font-bold text-sm focus:outline-none focus:ring-4 ring-cyan-200"
                    />
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveTab(cat.id)}
                                className={`
                            px-3 py-1.5 rounded-xl font-black border-2 transition-all flex items-center gap-1 text-xs whitespace-nowrap
                            ${activeTab === cat.id
                                        ? 'bg-cyan-400 border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                        : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'
                                    }
                          `}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 pb-24">
                    <div className="grid grid-cols-5 md:grid-cols-6 gap-3">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                className="bg-white border-2 border-black rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center hover:-translate-y-1 transition-transform"
                            >
                                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center p-2 relative">
                                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain drop-shadow-sm" />
                                    <span className="absolute top-1 right-1 bg-yellow-300 text-[9px] font-black px-1.5 py-0.5 rounded border border-black">
                                        {product.price} T
                                    </span>
                                </div>

                                <h3 className="font-black text-center leading-tight mb-1 text-[10px] truncate w-full">{product.name}</h3>

                                {product.targetSpecies && (
                                    <span className="text-[9px] font-bold text-gray-400 uppercase mb-2">
                                        {forSpeciesLabel}{product.targetSpecies}
                                    </span>
                                )}

                                <button
                                    onClick={() => addToCart(product)}
                                    className="text-[10px] py-1 w-full mt-auto bg-green-400 hover:bg-green-500 border-2 border-black rounded-lg font-black text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                                >
                                    {t.addToCart || 'ADD +'}
                                </button>
                            </div>
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="col-span-5 md:col-span-6 text-center py-10 opacity-50 font-bold text-sm">
                                {t.noSkillsFound || 'No items found.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cart Summary Bar */}
            {cart.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 bg-black text-white p-3 rounded-2xl shadow-xl flex justify-between items-center z-20 animate-slideUp">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 text-white font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-white">
                            {cart.length}
                        </div>
                        <div>
                            <p className="font-bold text-sm">{t.total || 'Total'}: {totalCost} TT</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCheckoutOpen(true)}
                        className="bg-yellow-400 text-black px-4 py-1.5 rounded-xl font-black border-2 border-transparent hover:border-white transition-all"
                    >
                        {t.checkout || 'Checkout'}
                    </button>
                </div>
            )}

            {/* Checkout Modal */}
            {isCheckoutOpen && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white border-4 border-black rounded-3xl w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="bg-yellow-300 p-4 border-b-4 border-black flex justify-between items-center">
                            <h2 className="font-black text-xl uppercase">{t.cart || 'Your Cart'}</h2>
                            <button onClick={() => setIsCheckoutOpen(false)} className="font-bold text-xl hover:bg-white/50 px-2 rounded">✕</button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 space-y-2">
                            {cart.map((item, idx) => (
                                <div key={`${item.id}-${idx}`} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border-2 border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <img src={item.imageUrl} className="w-8 h-8 object-contain" />
                                        <div>
                                            <p className="font-bold text-sm">{item.name}</p>
                                            <p className="text-xs text-gray-500">{item.price} TT</p>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(idx)} className="text-red-500 font-bold text-xs hover:bg-red-100 p-1 rounded">{removeLabel}</button>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t-4 border-black bg-gray-50">
                            <div className="flex justify-between items-center mb-4">
                                <span className="font-bold text-gray-500">{t.total || 'Total Cost'}</span>
                                <span className="font-black text-2xl">{totalCost} TT</span>
                            </div>
                            <div className="flex justify-between items-center mb-4 text-sm">
                                <span className="font-bold text-gray-500">{t.yourWallet || 'Your Balance'}</span>
                                <span className={`font-bold ${userCoins >= totalCost ? 'text-green-500' : 'text-red-500'}`}>{userCoins} TT</span>
                            </div>
                            <Button
                                onClick={handleCheckout}
                                fullWidth
                                disabled={isPurchasing}
                                variant="primary"
                            >
                                {isPurchasing ? (t.unlocking || 'Processing...') : (t.confirmPay || 'Pay Now')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
