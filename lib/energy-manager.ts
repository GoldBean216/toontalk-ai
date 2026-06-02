import { Contact, UserProfile } from '../types';

// Energy System Configuration
export const ENERGY_CONFIG = {
    MAX_ENERGY: 100,
    INITIAL_ENERGY: 100,

    // Energy consumption per message
    ENERGY_COST_PER_MESSAGE: 2,

    // Energy thresholds
    LOW_ENERGY_THRESHOLD: 30,
    CRITICAL_ENERGY_THRESHOLD: 10,

    // Energy regeneration
    ENERGY_REGEN_PER_HOUR: 5,

    // Gift/Heart energy restoration
    GIFT_ENERGY_RESTORE: 15,
    HEART_ENERGY_RESTORE: 5,

    // Token usage thresholds
    DAILY_TOKEN_SOFT_LIMIT: 50000, // Start reducing AI enthusiasm
    DAILY_TOKEN_HARD_LIMIT: 100000, // Significantly reduce AI responses

    // Daily token reset time (in hours, 0 = midnight)
    DAILY_RESET_HOUR: 0,
};

/**
 * Initialize energy for a new contact
 */
export function initializeEnergy(contact: Contact): Contact {
    return {
        ...contact,
        energy: ENERGY_CONFIG.INITIAL_ENERGY,
        maxEnergy: ENERGY_CONFIG.MAX_ENERGY,
        lastEnergyUpdate: Date.now(),
    };
}

/**
 * Regenerate energy based on time passed
 */
export function regenerateEnergy(contact: Contact): Contact {
    if (!contact.energy || !contact.lastEnergyUpdate) {
        return initializeEnergy(contact);
    }

    const now = Date.now();
    const hoursPassed = (now - contact.lastEnergyUpdate) / (1000 * 60 * 60);
    const energyToRestore = Math.floor(hoursPassed * ENERGY_CONFIG.ENERGY_REGEN_PER_HOUR);

    if (energyToRestore > 0) {
        const newEnergy = Math.min(
            (contact.energy || 0) + energyToRestore,
            contact.maxEnergy || ENERGY_CONFIG.MAX_ENERGY
        );

        return {
            ...contact,
            energy: newEnergy,
            lastEnergyUpdate: now,
        };
    }

    return contact;
}

/**
 * Consume energy for a message
 */
export function consumeEnergy(contact: Contact, tokensUsed: number = 0): Contact {
    const regenerated = regenerateEnergy(contact);

    // Base cost + additional cost based on tokens
    const tokenCost = Math.ceil(tokensUsed / 1000); // 1 energy per 1000 tokens
    const totalCost = ENERGY_CONFIG.ENERGY_COST_PER_MESSAGE + tokenCost;

    const newEnergy = Math.max(0, (regenerated.energy || 0) - totalCost);

    return {
        ...regenerated,
        energy: newEnergy,
        lastEnergyUpdate: Date.now(),
    };
}

/**
 * Restore energy via gift or heart
 */
export function restoreEnergy(contact: Contact, type: 'gift' | 'heart'): Contact {
    const regenerated = regenerateEnergy(contact);
    const restoreAmount = type === 'gift'
        ? ENERGY_CONFIG.GIFT_ENERGY_RESTORE
        : ENERGY_CONFIG.HEART_ENERGY_RESTORE;

    const newEnergy = Math.min(
        (regenerated.energy || 0) + restoreAmount,
        regenerated.maxEnergy || ENERGY_CONFIG.MAX_ENERGY
    );

    return {
        ...regenerated,
        energy: newEnergy,
        lastEnergyUpdate: Date.now(),
    };
}

/**
 * Check if AI should show fatigue
 */
export function shouldShowFatigue(contact: Contact): boolean {
    const regenerated = regenerateEnergy(contact);
    return (regenerated.energy || 0) <= ENERGY_CONFIG.LOW_ENERGY_THRESHOLD;
}

/**
 * Check if AI is critically tired (should refuse to chat)
 */
export function isCriticallyTired(contact: Contact): boolean {
    const regenerated = regenerateEnergy(contact);
    return (regenerated.energy || 0) <= ENERGY_CONFIG.CRITICAL_ENERGY_THRESHOLD;
}

/**
 * Get fatigue message based on energy level
 */
export function getFatigueMessage(contact: Contact): string | null {
    const regenerated = regenerateEnergy(contact);
    const energy = regenerated.energy || 0;

    if (energy <= ENERGY_CONFIG.CRITICAL_ENERGY_THRESHOLD) {
        return `😴 ${contact.name} is extremely exhausted and needs rest... Send a gift 🎁 or some love ❤️ to help them recover!`;
    } else if (energy <= ENERGY_CONFIG.LOW_ENERGY_THRESHOLD) {
        return `😮‍💨 ${contact.name} is getting tired... Consider sending a gift 🎁 or heart ❤️ to cheer them up!`;
    }

    return null;
}

/**
 * Calculate AI response enthusiasm based on user's token usage
 */
export function calculateEnthusiasm(dailyTokensUsed: number = 0): number {
    if (dailyTokensUsed < ENERGY_CONFIG.DAILY_TOKEN_SOFT_LIMIT) {
        return 1.0; // Full enthusiasm
    } else if (dailyTokensUsed < ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT) {
        // Gradually reduce enthusiasm from 1.0 to 0.5
        const excess = dailyTokensUsed - ENERGY_CONFIG.DAILY_TOKEN_SOFT_LIMIT;
        const range = ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT - ENERGY_CONFIG.DAILY_TOKEN_SOFT_LIMIT;
        return 1.0 - (excess / range) * 0.5;
    } else {
        return 0.5; // Minimum enthusiasm (50%)
    }
}

/**
 * Get response length modifier based on enthusiasm
 */
export function getResponseLengthModifier(enthusiasm: number): string {
    if (enthusiasm >= 0.9) {
        return "Be enthusiastic and detailed in your response.";
    } else if (enthusiasm >= 0.7) {
        return "Keep your response moderate in length.";
    } else {
        return "Keep your response brief and concise.";
    }
}

/**
 * Check if user has exceeded token limits
 */
export function hasExceededTokenLimit(dailyTokensUsed: number = 0): boolean {
    return dailyTokensUsed >= ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT;
}

/**
 * Get warning message for high token usage
 */
export function getTokenWarningMessage(dailyTokensUsed: number = 0): string | null {
    if (dailyTokensUsed >= ENERGY_CONFIG.DAILY_TOKEN_HARD_LIMIT) {
        return "⚠️ You've reached your daily chat limit. AI responses will be brief. Limit resets tomorrow!";
    } else if (dailyTokensUsed >= ENERGY_CONFIG.DAILY_TOKEN_SOFT_LIMIT) {
        return "⚠️ You're approaching your daily chat limit. AI responses may become shorter.";
    }
    return null;
}

/**
 * Check if daily token usage should be reset
 */
export function shouldResetDailyTokens(lastResetDate?: string): boolean {
    if (!lastResetDate) return true;

    const today = new Date();
    const lastReset = new Date(lastResetDate);

    // Reset if it's a new day
    return today.toDateString() !== lastReset.toDateString();
}

/**
 * Reset daily token usage if needed
 */
export function resetDailyTokensIfNeeded(user: UserProfile): UserProfile {
    if (shouldResetDailyTokens(user.lastTokenReset)) {
        return {
            ...user,
            dailyTokensUsed: 0,
            lastTokenReset: new Date().toISOString(),
        };
    }
    return user;
}

/**
 * Get AI personality-based energy consumption rate
 * Some species are more energetic and consume less energy
 */
export function getPersonalityEnergyModifier(species: string): number {
    const s = species.toLowerCase();

    // High energy species (consume 20% less energy)
    if (['dog', 'puppy', 'fox', 'rabbit'].some(k => s.includes(k))) {
        return 0.8;
    }

    // Low energy species (consume 20% more energy)
    if (['cat', 'koala', 'sloth', 'owl'].some(k => s.includes(k))) {
        return 1.2;
    }

    // Normal energy species
    return 1.0;
}

/**
 * Enhanced consume energy with personality modifier
 */
export function consumeEnergyWithPersonality(contact: Contact, tokensUsed: number = 0): Contact {
    const regenerated = regenerateEnergy(contact);

    // Base cost + additional cost based on tokens
    const tokenCost = Math.ceil(tokensUsed / 1000);
    const baseCost = ENERGY_CONFIG.ENERGY_COST_PER_MESSAGE + tokenCost;

    // Apply personality modifier
    const modifier = getPersonalityEnergyModifier(contact.species);
    const totalCost = Math.ceil(baseCost * modifier);

    const newEnergy = Math.max(0, (regenerated.energy || 0) - totalCost);

    return {
        ...regenerated,
        energy: newEnergy,
        lastEnergyUpdate: Date.now(),
    };
}

/**
 * Get energy status description for debugging/admin
 */
export function getEnergyStatus(contact: Contact): {
    energy: number;
    maxEnergy: number;
    percentage: number;
    status: 'full' | 'normal' | 'tired' | 'exhausted';
    canChat: boolean;
} {
    const regenerated = regenerateEnergy(contact);
    const energy = regenerated.energy || 0;
    const maxEnergy = regenerated.maxEnergy || ENERGY_CONFIG.MAX_ENERGY;
    const percentage = Math.round((energy / maxEnergy) * 100);

    let status: 'full' | 'normal' | 'tired' | 'exhausted';
    if (energy >= maxEnergy * 0.8) status = 'full';
    else if (energy > ENERGY_CONFIG.LOW_ENERGY_THRESHOLD) status = 'normal';
    else if (energy > ENERGY_CONFIG.CRITICAL_ENERGY_THRESHOLD) status = 'tired';
    else status = 'exhausted';

    return {
        energy,
        maxEnergy,
        percentage,
        status,
        canChat: energy > ENERGY_CONFIG.CRITICAL_ENERGY_THRESHOLD,
    };
}
