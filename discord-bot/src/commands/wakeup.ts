import {
	ButtonInteraction,
	ChatInputCommandInteraction,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder
} from 'discord.js';
import { isServerAlive, wakeUpComputer } from '../util.js';
import { connectToWS } from '../websocket.js';
import { commandChannel } from '../index.js';

export const data = new SlashCommandBuilder()
	.setName('wakeup')
	.setDescription('Wakes up the computer with the Minecraft Server')

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {

	const reply = await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		if(!await isServerAlive()) {
			const embed = new EmbedBuilder()
				.setTitle('Server starting')
				.setDescription(`Response to command: 'start', issued by ${interaction.user}.`)
				.addFields([{ name: '\u200B', value: 'Starting the machine.' }]);
			commandChannel?.send({ embeds: [embed] });
			await wakeUpComputer();
		}
		await connectToWS();
		reply.delete();
	} catch(e) {
		reply.edit({
			content: `Error when starting the machine: ${e instanceof Error ? e.message : String(e)}`,
		});
	}
}
