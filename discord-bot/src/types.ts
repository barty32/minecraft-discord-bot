import { ButtonInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export type SlashCommand = {
	data: SlashCommandBuilder;
	execute: (interaction: ChatInputCommandInteraction | ButtonInteraction) => Promise<void>;
}

export enum WSMessageType {
	MinecraftLog = 'minecraft_log',
	MinecraftStatusUpdate = 'minecraft_status_update',
	ComputerStatusUpdate = 'computer_status_update',
	Message = 'message',
	Error = 'error',
}

export interface WSMessage<T> {
	type: WSMessageType;
	content: T;
	responseTo?: string;
	issuedBy?: string;
}

export enum ServerStatus {
	Online = 'ONLINE',
	Offline = 'OFFLINE',
	Starting = 'STARTING',
	Stopping = 'STOPPING',
}

export interface MinecraftStatusUpdate {
	status: ServerStatus;
	numPlayers: number;
	maxPlayers: number;
	//...
}

export interface ComputerStatusUpdate {
	status: ServerStatus;
	cpuUsage: number;
	diskTotal: number;
	diskUsed: number;
	ramTotal: number;
	ramUsed: number;
}