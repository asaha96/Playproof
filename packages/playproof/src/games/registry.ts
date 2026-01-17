/**
 * Game Registry
 * Maps game IDs to game classes for dynamic selection
 */

import { BubblePopGame } from './bubble-pop';
import { MiniGolfGame } from './pixi/mini-golf';
import { BasketballGame } from './pixi/basketball';
import { ArcheryGame } from './pixi/archery';
import type { GameId, GameInfo, PlayproofConfig, SDKHooks, BaseGame } from '../types';

type GameConstructor = new (gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks) => BaseGame;

interface GameRegistryEntry {
    GameClass: GameConstructor;
    name: string;
    description: string;
    duration: number;
    isPixi: boolean;
}

/**
 * Available games with metadata
 */
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
    'bubble-pop': {
        GameClass: BubblePopGame as unknown as GameConstructor,
        name: 'Bubble Pop',
        description: 'Pop the bubbles as fast as you can!',
        duration: 10000,
        isPixi: false
    },
    'mini-golf': {
        GameClass: MiniGolfGame as unknown as GameConstructor,
        name: 'Mini Golf',
        description: 'Putt the ball into the hole!',
        duration: 6000,
        isPixi: true
    },
    'basketball': {
        GameClass: BasketballGame as unknown as GameConstructor,
        name: 'Basketball',
        description: 'Shoot the ball through the hoop!',
        duration: 6000,
        isPixi: true
    },
    'archery': {
        GameClass: ArcheryGame as unknown as GameConstructor,
        name: 'Archery',
        description: 'Hit the target with your arrow!',
        duration: 6000,
        isPixi: true
    }
};

/**
 * Get list of available game IDs
 */
export function getAvailableGames(): string[] {
    return Object.keys(GAME_REGISTRY);
}

/**
 * Get a random game ID
 */
export function getRandomGameId(exclude: string[] = []): string {
    const available = getAvailableGames().filter(id => !exclude.includes(id));
    return available[Math.floor(Math.random() * available.length)] || 'bubble-pop';
}

/**
 * Get game info by ID
 */
export function getGameInfo(gameId: string): GameRegistryEntry {
    return GAME_REGISTRY[gameId] || GAME_REGISTRY['bubble-pop'];
}

/**
 * Create a game instance
 */
export function createGame(
    gameId: string,
    gameArea: HTMLElement,
    config: PlayproofConfig,
    hooks: SDKHooks = {} as SDKHooks
): BaseGame {
    const info = getGameInfo(gameId);
    const GameClass = info.GameClass;

    // Override duration if game has a preferred one
    const gameConfig: PlayproofConfig = {
        ...config,
        gameDuration: config.gameDuration || info.duration
    };

    return new GameClass(gameArea, gameConfig, hooks);
}

/**
 * Get instruction text for a game
 */
export function getGameInstructions(gameId: string): { title: string; description: string } {
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
