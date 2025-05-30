import {
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder
} from 'discord.js';
import { sendRequest, sleep } from '../util.js';
import { connectToWS } from '../websocket.js';

export const data = new SlashCommandBuilder()
	.setName('cmd')
	.setDescription('Sends a command to the Minecraft Server')
	.addStringOption(option =>
		option.setName('command')
			.setDescription('The command')
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction) {

	const reply = await interaction.reply({
		flags: MessageFlags.Ephemeral,
		content: `Sending the command to the server...`
	});

	try {
		await connectToWS();
		const response = JSON.parse(await sendRequest('POST', '/api/command', JSON.stringify({
			command: interaction.options.getString('command', true)
		})));
		if(response.error !== false) throw new Error(response.message);
		await sleep(5000);
		reply.edit({
			content: `Command response: ${response.message}`,
		});
	} catch(error) {
		reply.edit({
			content: `Error when sending the command: ${error}`,
		});
	}
}
