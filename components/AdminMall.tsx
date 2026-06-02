import React, { useState, useEffect } from 'react';
import { Product, ProductCategory } from '../types';
import { Button } from './Button';

interface AdminMallProps {
    onBack: () => void;
}

export const AdminMall: React.FC<AdminMallProps> = ({ onBack }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const categories: ProductCategory[] = ['food', 'dressup', 'toy', 'furniture'];

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/mall');
            const data = await res.json();
            setProducts(data);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;

        const method = editingProduct.id ? 'PUT' : 'POST';
        const body = editingProduct.id
            ? editingProduct
            : { isPurchase: false, product: { ...editingProduct, id: editingProduct.id || Date.now().toString() } };

        try {
            const res = await fetch('/api/mall', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setIsFormOpen(false);
                setEditingProduct(null);
                fetchProducts();
            }
        } catch (e) { console.error(e); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            const res = await fetch(`/api/mall?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchProducts();
        } catch (e) { console.error(e); }
    };

    const openEdit = (product: Product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const openCreate = () => {
        setEditingProduct({
            name: '',
            price: 0,
            category: 'food',
            imageUrl: '',
            targetSpecies: ''
        });
        setIsFormOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b-4 border-black p-4 sticky top-0 z-10 flex items-center justify-between shadow-md">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 text-2xl font-bold p-2 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all">
                        ←
                    </button>
                    <h1 className="text-2xl font-black tracking-wider uppercase">Mall Admin</h1>
                </div>
                <Button onClick={openCreate} className="bg-green-400 hover:bg-green-500">
                    + Add Product
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pb-24">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin text-4xl">🐱</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map(product => (
                            <div key={product.id} className="bg-white border-4 border-black rounded-3xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(product)} className="bg-yellow-300 p-2 rounded-lg border-2 border-black hover:bg-yellow-400">
                                        ✏️
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="bg-red-300 p-2 rounded-lg border-2 border-black hover:bg-red-400">
                                        🗑️
                                    </button>
                                </div>
                                <div className="h-40 bg-gray-100 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border-2 border-black/5">
                                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                </div>
                                <h3 className="font-black text-lg uppercase mb-1">{product.name}</h3>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border-2 border-blue-200 text-xs uppercase">
                                        {product.category}
                                    </span>
                                    <span className="font-black text-xl text-yellow-600">
                                        {product.price} TT
                                    </span>
                                </div>
                                {product.targetSpecies && (
                                    <p className="text-xs font-bold text-gray-400 mt-2 uppercase">
                                        Target: {product.targetSpecies}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border-4 border-black rounded-[40px] w-full max-w-md p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-popIn">
                        <h2 className="text-3xl font-black mb-6 uppercase">
                            {editingProduct?.id ? 'Edit Product' : 'New Product'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-4 border-black rounded-2xl p-3 font-bold focus:bg-yellow-50 outline-none"
                                    value={editingProduct?.name || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1">Price (TT)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full border-4 border-black rounded-2xl p-3 font-bold focus:bg-yellow-50 outline-none"
                                        value={editingProduct?.price || 0}
                                        onChange={e => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase mb-1">Category</label>
                                    <select
                                        className="w-full border-4 border-black rounded-2xl p-3 font-bold focus:bg-yellow-50 outline-none appearance-none"
                                        value={editingProduct?.category}
                                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as ProductCategory })}
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Image URL</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-4 border-black rounded-2xl p-3 font-bold focus:bg-yellow-50 outline-none"
                                    value={editingProduct?.imageUrl || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase mb-1">Target Species (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full border-4 border-black rounded-2xl p-3 font-bold focus:bg-yellow-50 outline-none"
                                    value={editingProduct?.targetSpecies || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, targetSpecies: e.target.value })}
                                    placeholder="e.g. Cat, Dog, All"
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <Button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 bg-gray-200">
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1 bg-yellow-400">
                                    Save
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
