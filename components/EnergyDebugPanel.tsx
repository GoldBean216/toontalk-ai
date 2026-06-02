import React from 'react';
import { Contact, UserProfile } from '../types';
import { getEnergyStatus, ENERGY_CONFIG } from '../lib/energy-manager';

interface EnergyDebugPanelProps {
    contacts: Contact[];
    user: UserProfile;
    onClose: () => void;
}

export const EnergyDebugPanel: React.FC<EnergyDebugPanelProps> = ({ contacts, user, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">⚡ Energy System Debug Panel</h2>
                    <button
                        onClick={onClose}
                        className="text-2xl hover:bg-gray-100 w-10 h-10 rounded-full"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* User Token Usage */}
                    <div className="bg-blue-50 rounded-xl p-4">
                        <h3 className="text-xl font-bold mb-3">👤 User Token Usage</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Total Tokens Used</p>
                                <p className="text-2xl font-bold">{user.totalTokensUsed?.toLocaleString() || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Daily Tokens Used</p>
                                <p className="text-2xl font-bold">{user.dailyTokensUsed?.toLocaleString() || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Soft Limit</p>
                                <p className="text-lg">{ENERGY_CONFIG.DAILY_TOKEN_SOFT_LIMIT.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Hard Limit</p>
                                <p className="text-lg">{ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT.toLocaleString()}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-600">Last Reset</p>
                                <p className="text-sm">{user.lastTokenReset ? new Date(user.lastTokenReset).toLocaleString() : 'Never'}</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-4">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Daily Usage Progress</span>
                                <span>{Math.round(((user.dailyTokensUsed || 0) / ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT) * 100)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full transition-all ${(user.dailyTokensUsed || 0) >= ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT
                                            ? 'bg-red-500'
                                            : (user.dailyTokensUsed || 0) >= ENERGY_CONFIG.DAILY_TOKEN_SOFT_LIMIT
                                                ? 'bg-yellow-500'
                                                : 'bg-green-500'
                                        }`}
                                    style={{
                                        width: `${Math.min(((user.dailyTokensUsed || 0) / ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT) * 100, 100)}%`
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Contacts Energy Status */}
                    <div>
                        <h3 className="text-xl font-bold mb-3">🤖 AI Contacts Energy Status</h3>
                        <div className="space-y-3">
                            {contacts.filter(c => !c.isGroup).map(contact => {
                                const status = getEnergyStatus(contact);
                                return (
                                    <div key={contact.id} className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <img src={contact.avatarUrl} alt={contact.name} className="w-12 h-12 rounded-full" />
                                            <div className="flex-1">
                                                <p className="font-bold">{contact.name}</p>
                                                <p className="text-sm text-gray-600">{contact.species}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-bold">{status.energy}/{status.maxEnergy}</p>
                                                <p className={`text-sm font-semibold ${status.status === 'full' ? 'text-green-600' :
                                                        status.status === 'normal' ? 'text-blue-600' :
                                                            status.status === 'tired' ? 'text-yellow-600' :
                                                                'text-red-600'
                                                    }`}>
                                                    {status.status.toUpperCase()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Energy Bar */}
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className={`h-3 rounded-full transition-all ${status.status === 'full' ? 'bg-green-500' :
                                                        status.status === 'normal' ? 'bg-blue-500' :
                                                            status.status === 'tired' ? 'bg-yellow-500' :
                                                                'bg-red-500'
                                                    }`}
                                                style={{ width: `${status.percentage}%` }}
                                            />
                                        </div>

                                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                                            <div>
                                                <span className="font-semibold">Can Chat:</span> {status.canChat ? '✅' : '❌'}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Last Update:</span>{' '}
                                                {contact.lastEnergyUpdate
                                                    ? new Date(contact.lastEnergyUpdate).toLocaleTimeString()
                                                    : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-semibold">Percentage:</span> {status.percentage}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* System Configuration */}
                    <div className="bg-purple-50 rounded-xl p-4">
                        <h3 className="text-xl font-bold mb-3">⚙️ System Configuration</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="font-semibold">Max Energy</p>
                                <p>{ENERGY_CONFIG.MAX_ENERGY}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Initial Energy</p>
                                <p>{ENERGY_CONFIG.INITIAL_ENERGY}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Cost Per Message</p>
                                <p>{ENERGY_CONFIG.ENERGY_COST_PER_MESSAGE}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Regen Per Hour</p>
                                <p>{ENERGY_CONFIG.ENERGY_REGEN_PER_HOUR}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Low Energy Threshold</p>
                                <p>{ENERGY_CONFIG.LOW_ENERGY_THRESHOLD}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Critical Threshold</p>
                                <p>{ENERGY_CONFIG.CRITICAL_ENERGY_THRESHOLD}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Gift Restore</p>
                                <p>{ENERGY_CONFIG.GIFT_ENERGY_RESTORE}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Heart Restore</p>
                                <p>{ENERGY_CONFIG.HEART_ENERGY_RESTORE}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
