import config from '../config.json' with { type: "json" };

export const DISCORD_TOKEN = config.token || '';
export const DISCORD_GUILD_ID = config.guild_id || '';
export const DISCORD_APPLICATION_ID = config.application_id || '!';
export const DISCORD_CONTROL_CHANNEL_ID = config.control_channel || '';
export const DISCORD_COMMAND_CHANNEL_ID = config.command_channel || '';

export const SERVER_ADDRESS = config.server_address || 'localhost';
export const SERVER_PORT = config.server_port || 25566;
export const SERVER_API = `http://${SERVER_ADDRESS}:${SERVER_PORT}`;
export const WS_ADDRESS = `ws://${SERVER_ADDRESS}:${SERVER_PORT}/api/ws`;
export const SERVER_MAC = config.server_mac || '';
export const SECRET_KEY = config.secret_key || '';
export const JOIN_MESSAGE = config.join_message || 'You can join it now!';