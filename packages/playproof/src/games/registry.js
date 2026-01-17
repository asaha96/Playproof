/**
 * Game Registry
 * Maps game IDs to game classes for dynamic selection
 */

import { BubblePopGame } from './bubble-pop.js';
import { MiniGolfGame } from './pixi/mini-golf.js';
import { BasketballGame } from './pixi/basketball.js';
import { ArcheryGame } from './pixi/archery.js';

/**
 * Available games with metadata
 */
export const GAME_REGISTRY = {
    'bubble-pop': {
        GameClass: BubblePopGame,
        name: 'Bubble Pop',
        description: 'Pop the bubbles as fast as you can!',
        duration: 10000,
        isPixi: false
    },
    'mini-golf': {
        GameClass: MiniGolfGame,
        name: 'Mini Golf',
        description: 'Putt the ball into the hole!',
        duration: 6000,
        isPixi: true
    },
    'basketball': {
        GameClass: BasketballGame,
        name: 'Basketball',
        description: 'Shoot the ball through the hoop!',
        duration: 6000,
        isPixi: true
    },
    'archery': {
        GameClass: ArcheryGame,
        name: 'Archery',
        description: 'Hit the target with your arrow!',
        duration: 6000,
        isPixi: true
    }
};

/**
 * Get list of available game IDs
 */
export function getAvailableGames() {
    return Object.keys(GAME_REGISTRY);
}

/**
 * Get a random game ID
 */
export function getRandomGameId(exclude = []) {
    const available = getAvailableGames().filter(id => !exclude.includes(id));
    return available[Math.floor(Math.random() * available.length)] || 'bubble-pop';
}

/**
 * Get game info by ID
 */
export function getGameInfo(gameId) {
    return GAME_REGISTRY[gameId] || GAME_REGISTRY['bubble-pop'];
}

/**
 * Create a game instance
 * @param {string} gameId - Game identifier
 * @param {HTMLElement} gameArea - DOM element to mount into
 * @param {Object} config - PlayProof config
 * @param {Object} hooks - SDK hooks (optional)
 */
export function createGame(gameId, gameArea, config, hooks = {}) {
    const info = getGameInfo(gameId);
    const GameClass = info.GameClass;
    
    // Override duration if game has a preferred one
    const gameConfig = {
        ...config,
        gameDuration: config.gameDuration || info.duration
    };
    
    return new GameClass(gameArea, gameConfig, hooks);
}

/**
 * Get instruction text for a game
 */
export function getGameInstructions(gameId) {
    const info = getGameInfo(gameId);
    return {
        title: info.name,
        description: info.description
    };
}

export default {
    GAME_REGISTRY,
    getAvailableGames,
    getRandomGameId,
    getGameInfo,
    createGame,
    getGameInstructions
};
