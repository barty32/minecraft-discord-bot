import {
	ButtonInteraction,
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder
} from 'discord.js';
import { sendRequest, sleep } from '../util.js';
import { connectToWS } from '../websocket.js';

export const data = new SlashCommandBuilder()
	.setName('restart')
	.setDescription('Restarts the Minecraft Server')

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {

	const reply = await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		await connectToWS();
		const response = await sendRequest('POST', '/api/restart', interaction.user.toString());
		if(response !== 'OK') throw new Error(response);
		await sleep(5000);
		reply.delete();
	} catch(e) {
		reply.edit({
			content: `Error when restarting the server: ${e instanceof Error ? e.message : String(e)}`,
		});
	}
}
