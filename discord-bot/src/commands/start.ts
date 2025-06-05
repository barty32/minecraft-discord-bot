import {
	ButtonInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder
} from 'discord.js';
import { formatCommandMention, isServerAlive, sendRequest, sleep, wakeUpComputer } from '../util.js';
import { connectToWS } from '../websocket.js';
import { commandChannel } from '../index.js';

export const data = new SlashCommandBuilder()
	.setName('start')
	.setDescription('Starts the Minecraft Server')

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {

	const reply = await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		if(!await isServerAlive()) {
			const embed = new EmbedBuilder()
				.setTitle('Server starting')
				.setDescription(`Response to command: ${formatCommandMention('start')}, issued by ${interaction.user}.`)
				.addFields([{ name: '\u200B', value: 'Starting the machine.' }]);
			commandChannel?.send({ embeds: [embed] });
			await wakeUpComputer();
		}
		await connectToWS();
		const response = await sendRequest('POST', '/api/start', interaction.user.toString());
		if(response !== 'OK') throw new Error(response);
		await sleep(5000);
		reply.delete();
	} catch(e) {
		reply.edit({
			content: `Error when starting the server: ${e instanceof Error ? e.message : String(e)}`,
		});
	}
}
