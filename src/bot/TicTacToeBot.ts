import { Client, Message, TextChannel } from 'discord.js';
import TicTacToe from '../index';
import CommandHandler from '@bot/CommandHandler';
import EventHandler from '@bot/EventHandler';
import StartCommand from '@bot/commands/StartCommand';
import GameChannel from '@bot/channel/GameChannel';

/**
 * Manages all interactions with the Discord bot.
 *
 * @author Utarwyn <maximemalgorn@gmail.com>
 * @since 2.0.0
 */
export default class TicTacToeBot {
    /**
     * Game controller
     * @private
     */
    private readonly _controller: TicTacToe;
    /**
     * Manages the command handling
     * @private
     */
    private readonly _commandHandler: CommandHandler;
    /**
     * Manages the command handling
     * @private
     */
    private readonly _eventHandler: EventHandler;
    /**
     * Collection with all channels in which games are handled.
     * @private
     */
    private _channels: Array<GameChannel>;

    /**
     * Constructs the Discord bot interaction object.
     *
     * @param controller   game controller
     * @param eventHandler event handling system
     */
    constructor(controller: TicTacToe, eventHandler: EventHandler) {
        this._controller = controller;
        this._eventHandler = eventHandler;
        this._commandHandler = new CommandHandler();
        this._channels = [];

        this.registerCommands();
    }

    /**
     * Retrieves the game controller.
     */
    public get controller(): TicTacToe {
        return this._controller;
    }

    /**
     * Retrieves the event handling system.
     */
    public get eventHandler(): EventHandler {
        return this._eventHandler;
    }

    /**
     * Attaches a new Discord client to the module by preparing command handing.
     */
    public attachToClient(client: Client): void {
        client.on('message', this.onMessage.bind(this));
    }

    /**
     * Retrieves a game channel from the Discord object.
     * Creates a new game channel innstance if not found in the cache.
     *
     * @param parent parent Discord channel object
     */
    public getorCreateGameChannel(parent: TextChannel): GameChannel {
        const found = this._channels.find(channel => channel.channel === parent);
        if (found) {
            return found;
        } else {
            const instance = new GameChannel(this, parent);
            this._channels.push(instance);
            return instance;
        }
    }

    /**
     * Register all commands to be handled by the bot.
     */
    private registerCommands(): void {
        this._commandHandler.addCommand(new StartCommand(this));
    }

    /**
     * Called when a message is sent and has been detected by the bot.
     *
     * @param message message object received from Discord
     */
    private onMessage(message: Message): void {
        if (!message.author.bot && message.channel.type === 'text') {
            this._commandHandler.execute(message);
        }
    }
}
