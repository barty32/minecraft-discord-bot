import {
	ButtonInteraction,
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder
} from 'discord.js';
import { sendRequest, sleep } from '../util.js';
import { connectToWS } from '../websocket.js';

export const data = new SlashCommandBuilder()
	.setName('stop')
	.setDescription('Stops the Minecraft Server')
	.addBooleanOption(option =>
		option.setName('autobackup')
			.setDescription('Save automatic world backup after stopping the server')
			.setRequired(false)
	);

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {

	const reply = await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});
	const autobackup = (interaction.isChatInputCommand() && interaction.options.getBoolean('autobackup', false) === false) ? false : true;

	try {
		await connectToWS();
		const response = await sendRequest('POST', '/api/stop', interaction.user.toString(), { autobackup });
		if(response !== 'OK') throw new Error(response);
		await sleep(5000);
		reply.delete();
	} catch(e) {
		reply.edit({
			content: `Error when stopping the server: ${e instanceof Error ? e.message : String(e)}`,
		});
	}
}
