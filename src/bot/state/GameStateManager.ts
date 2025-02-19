import DuelRequest from '@bot/entity/DuelRequest';
import GameBoard from '@bot/entity/GameBoard';
import MessagingTunnel from '@bot/messaging/MessagingTunnel';
import GameStateValidator from '@bot/state/GameStateValidator';
import TicTacToeBot from '@bot/TicTacToeBot';
import AI from '@tictactoe/ai/AI';
import { AIDifficultyLevel } from '@tictactoe/ai/AIDifficultyLevel';
import Entity from '@tictactoe/Entity';
import { GuildMember } from 'discord.js';

/**
 * Manages and stores game state through the module.
 *
 * @author Utarwyn
 * @since 2.2.0
 * @internal
 */
export default class GameStateManager {
    /**
     * Module bot instance.
     */
    public readonly bot: TicTacToeBot;
    /**
     * Collection of member cooldown end times.
     */
    public readonly memberCooldownEndTimes: Map<string, number>;
    /**
     * Collection of gameboards managed by the instance.
     */
    public readonly gameboards: Array<GameBoard>;
    /**
     * Stores game validator.
     * @private
     */
    private readonly validator: GameStateValidator;

    /**
     * Creates the game state manager.
     *
     * @param bot module bot instance
     */
    constructor(bot: TicTacToeBot) {
        this.bot = bot;
        this.gameboards = [];
        this.memberCooldownEndTimes = new Map();
        this.validator = new GameStateValidator(this);
    }

    /**
     * Requests a duel between two members.
     *
     * @param tunnel messaging tunnel that initiated the request
     * @param invited member invited to be part of the duel
     * @returns promise resolved if duel request has been handled, rejected otherwise
     */
    public async requestDuel(tunnel: MessagingTunnel, invited: GuildMember): Promise<void> {
        if (this.validator.isInteractionValid(tunnel)) {
            if (!this.validator.isNewGamePossible(tunnel, invited)) {
                return Promise.reject();
            }

            const duel = new DuelRequest(
                this,
                tunnel,
                invited,
                this.bot.configuration.requestExpireTime,
                this.bot.configuration.requestReactions,
                this.bot.configuration.embedColor
            );

            // Reply with the duel request and attach the created message
            const message = await tunnel.replyWith(duel.content);
            await duel.attachTo(message);

            // Setup user cooldown
            const cooldown = this.bot.configuration.requestCooldownTime ?? 0;
            if (cooldown > 0) {
                this.memberCooldownEndTimes.set(tunnel.author.id, Date.now() + cooldown * 1000);
            }
        }
    }

    /**
     * Creates a game with one member and another or an AI.
     *
     * @param tunnel messaging tunnel that initiated the game creation
     * @param invited member invited to be part of the game, undefined means the AI
     * @returns promise resolved if game request has been handled, rejected otherwise
     */
    public async createGame(tunnel: MessagingTunnel, invited?: GuildMember): Promise<void> {
        if (this.validator.isInteractionValid(tunnel)) {
            if (!this.validator.isNewGamePossible(tunnel, invited)) {
                return Promise.reject();
            }

            const gameboard = new GameBoard(
                this,
                tunnel,
                invited ?? this.createAI(),
                this.bot.configuration
            );

            // Emit a custom event which can cancel the game creation if throws an error
            this.bot.eventHandler.emitEvent('newGame', { players: gameboard.entities });

            // Register the gameboard in the list
            this.gameboards.push(gameboard);

            // Reply with the gameboard and attach the created message
            const message = await tunnel.replyWith(gameboard.content);
            return gameboard.attachTo(message);
        }
    }

    /**
     * Ends a game based on its gameboard and the entity who wins.
     *
     * @param gameboard gameboard object that needs to be removed
     * @param winner winner of the game, undefined means game expiration, null is a tie
     */
    public endGame(gameboard: GameBoard, winner?: Entity | null): void {
        if (winner) {
            this.bot.eventHandler.emitEvent('win', {
                winner,
                loser: gameboard.entities.find(entity => entity !== winner)
            });
        } else if (winner === null) {
            this.bot.eventHandler.emitEvent('tie', {
                players: gameboard.entities
            });
        }

        this.gameboards.splice(this.gameboards.indexOf(gameboard), 1);
    }

    /**
     * Creates an AI with the difficulty defined in the configuration.
     *
     * @returns AI object
     */
    private createAI(): AI {
        const aiDifficulty = this.bot.configuration.aiDifficulty;
        return new AI(aiDifficulty ? AIDifficultyLevel[aiDifficulty] : undefined);
    }
}
