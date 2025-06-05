import fs from 'node:fs';
import path from 'node:path';
import WS from 'ws';
import {
	Client,
	GatewayIntentBits,
	EmbedBuilder,
	TextChannel,
	Events,
	Collection,
	MessageFlags
} from 'discord.js';
import { ComputerStatusUpdate, MinecraftStatusUpdate, ServerStatus, SlashCommand, WSMessage, WSMessageType } from './types.js';
import { DISCORD_COMMAND_CHANNEL_ID, DISCORD_CONTROL_CHANNEL_ID, DISCORD_GUILD_ID, DISCORD_TOKEN } from './constants.js';
import { formatCommandMention, isServerAlive, sendControlPanel, sendRequest } from './util.js';
import { connectToWS } from './websocket.js';


const slashCommands = new Collection<string, SlashCommand>();
export const slashCommandIds = new Collection<string, string>();
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages], //GatewayIntentBits.MessageContent
});

export let computerStatus: ComputerStatusUpdate = {
	status: ServerStatus.Offline,
	cpuUsage: 0,
	diskTotal: 0,
	diskUsed: 0,
	ramTotal: 0,
	ramUsed: 0,
};

export let serverStatus: MinecraftStatusUpdate = {
	status: ServerStatus.Offline,
	numPlayers: 0,
	maxPlayers: 0,
};

client.on(Events.Error, (e) => {
	console.error('Discord client error:', e);
});

client.on(Events.Warn, (w) => {
	console.warn('Discord client warning:', w);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if(interaction.isChatInputCommand()) {
		const command = slashCommands.get(interaction.commandName);
		if(!command) {
			console.error(`No command matching '${interaction.commandName}' was found.`);
			return;
		}
		try {
			await command.execute(interaction);
		} catch(error) {
			console.error(error);
			if(interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		}
	}
	else if(interaction.isButton()) {
		const command = slashCommands.get(interaction.customId);
		if(!command) {
			console.error(`No command matching '${interaction.customId}' was found.`);
			return;
		}
		try {
			await command.execute(interaction);
		} catch(error) {
			console.error(error);
			if(interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		}
	}
});

export let controlChannel: TextChannel | null = null;
export let commandChannel: TextChannel | null = null;
// export let logChannel: TextChannel | null = null;

client.once(Events.ClientReady, async () => {
	// wait for client to connect
	// await new Promise<void>((res, rej) => {
	// 	client.on('error', rej);
	// 	client.on('ready', (_) => res());
	// });

	console.log(`Logged in as ${client.user?.tag}!`);

	try {
		const cch = await client.channels.fetch(DISCORD_CONTROL_CHANNEL_ID);
		if(cch instanceof TextChannel) {
			controlChannel = cch;
		}
	} catch(e) {
		console.error('Failed to fetch control channel:', );
	}

	try {
		const cmdch = await client.channels.fetch(DISCORD_COMMAND_CHANNEL_ID);
		if(cmdch instanceof TextChannel) {
			commandChannel = cmdch;
		}
	} catch(e) {
		console.error('Failed to fetch command channel:', );
	}

	// try {
	// 	const lch = await client.channels.fetch(process.env.LOG_CHANNEL ?? '');
	// 	if(lch instanceof TextChannel) {
	// 		logChannel = lch;
	// 	}
	// } catch(e) {
	// 	console.error('Failed to fetch log channel:');
	// }

	try {
		const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
		if(!guild) throw '';
		const collection = await guild.commands.fetch();
		if(!collection) throw '';
		for(const command of collection.values()) {
			slashCommandIds.set(command.name, command.id);
		}
	} catch(e) {}

	if(await isServerAlive()) {
		computerStatus.status = ServerStatus.Online;
		await connectToWS();
		await sendRequest('GET', '/api/status');
	}

	await sendControlPanel(serverStatus, computerStatus);

	setInterval(async () => {
		if(await isServerAlive()) {
			if(computerStatus.status !== ServerStatus.Stopping) {
				computerStatus.status = ServerStatus.Online;
			}
		}
		else if(computerStatus.status !== ServerStatus.Starting){
			computerStatus.status = ServerStatus.Offline;
		}
		await sendControlPanel(serverStatus, computerStatus);
	}, 10000);
});

export async function handleWSMessage(data: WS.RawData) {
	const message = JSON.parse(data.toString()) as WSMessage<any>;
	console.log('Received message from WS: ', message.content);
	switch(message.type) {
		case WSMessageType.MinecraftLog:
			/*if(log_channel) {
				const max_message_len = 2000;
				if(
					parsed.payload.includes(
						'Potentially Dangerous alternative prefix'
					) ||
					parsed.payload.includes(
						'Catching dependency model net.minecraftforge.client.model.ModelLoader'
					)
				)
					return;

				let final_payload = [parsed.payload];
				if(final_payload[0].length > max_message_len) {
					const regexp = new RegExp(`.{1,${max_message_len}}`, 'g');
					final_payload = final_payload[0].match(regexp);
				}
				for(const m of final_payload) {
					log_channel.send({ content: '```' + m + '```' });
				}
			}*/
			break;
		case WSMessageType.MinecraftStatusUpdate:
			serverStatus = (message as WSMessage<MinecraftStatusUpdate>).content;
			//sendControlPanel(serverStatus, computerStatus);
			// if(parsed.payload === 'ONLINE') {
			// 	//starting = false;
			// 	const embed = new EmbedBuilder()
			// 		.setColor('#00ff00')
			// 		.setTitle('🟢 Server ONLINE')
			// 		.setDescription('@everyone The server is online!')
			// 		.addFields([{ name: '\u200B', value: 'You can now join it: **minecraft.janstaffa.cz**.' }]);
			// 	command_channel.send({ embeds: [embed] });
			// }
			break;

		case WSMessageType.ComputerStatusUpdate:
			computerStatus = (message as WSMessage<ComputerStatusUpdate>).content;
			//sendControlPanel(serverStatus, computerStatus);
			break;

		case WSMessageType.Message:
			{
				const embed = new EmbedBuilder()
					.setTitle('Message')
					.addFields([{ name: '\u200B', value: message.content }]);
				if(message.responseTo && message.issuedBy)
					embed.setDescription(`Response to command: ${formatCommandMention(message.responseTo)}, issued by ${message.issuedBy}.`);
				commandChannel?.send({ embeds: [embed] });
			}
			break;
		case WSMessageType.Error:
			console.log('Received error from WS: ', message.content);
			{
				const embed = new EmbedBuilder()
					.setColor('#FF0000')
					.setTitle('Error')
					.addFields([{ name: '\u200B', value: message.content }]);
				if(message.responseTo && message.issuedBy)
					embed.setDescription(`Response to command: ${formatCommandMention(message.responseTo)}, issued by ${message.issuedBy}.`);
				commandChannel?.send({ embeds: [embed] });
			}
			break;
	}
}

const registerSlashCommands = async () => {
	// Load and register slash commands
	const commandsPath = path.join(import.meta.dirname, 'commands');
	const commandFiles = fs.readdirSync(commandsPath)//.filter(file => file.endsWith('.js'));
	for(const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = await import(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if('data' in command && 'execute' in command) {
			console.log(`Registering slash command: '${command.data.name}'`);
			slashCommands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The slash command at '${filePath}' is missing a required "data" or "execute" property.`);
		}
	}
}

client.login(DISCORD_TOKEN);

registerSlashCommands();
