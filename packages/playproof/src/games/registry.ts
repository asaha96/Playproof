/**
 * Game Registry
 * Maps game IDs to game classes for dynamic selection
 */

import { BubblePopGame } from './three/bubble-pop';
import { ArcheryGame } from './three/archery';
import { OsuGame } from './three/osu';
import type { GameId, PlayproofConfig, SDKHooks, BaseGame } from '../types';

type GameConstructor = new (gameArea: HTMLElement, config: PlayproofConfig, hooks: SDKHooks) => BaseGame;

interface GameRegistryEntry {
    GameClass: GameConstructor;
    name: string;
    description: string;
    duration: number;
    isThree: boolean;
}

/**
 * Available games with metadata
 * 
 * Adding a new game:
 * 1. Create a new game class in ./three/ extending ThreeBaseGame
 * 2. Import it here
 * 3. Add an entry to GAME_REGISTRY with unique key
 * 4. Update GameId type in types.ts
 */
export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
    'bubble-pop': {
        GameClass: BubblePopGame as unknown as GameConstructor,
        name: 'Bubble Pop',
        description: 'Pop the bubbles as fast as you can!',
        duration: 10000,
        isThree: true
    },
    'archery': {
        GameClass: ArcheryGame as unknown as GameConstructor,
        name: 'Archery',
        description: 'Draw back and hit the target!',
        duration: 12000,
        isThree: true
    },
    'osu': {
        GameClass: OsuGame as unknown as GameConstructor,
        name: 'Rhythm',
        description: 'Click circles and follow sliders to the beat!',
        duration: 15000,
        isThree: true
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
