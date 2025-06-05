import {
	ButtonInteraction,
	ChatInputCommandInteraction,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import { sendRequest, sleep } from '../util.js';
import { connectToWS } from '../websocket.js';

export const data = new SlashCommandBuilder()
	.setName('loadbackup')
	.setDescription('Restores a backup of the Minecraft Server world')
	.addStringOption(option =>
		option.setName('id')
			.setDescription('ID of the backup to load')
			.setRequired(true)
	);

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {

	const reply = await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		await connectToWS();
		const backupId =
			interaction.isChatInputCommand() ?
				interaction.options.getString('id', true) :
				interaction.customId.split(':')[1];
		if (!backupId) throw new Error('No backup ID provided');
		const response = await sendRequest('POST', '/api/backup/load/' + backupId, interaction.user.toString());
		if(response !== 'OK') throw new Error(response);
		await sleep(5000);
		reply.delete();
	} catch(e) {
		reply.edit({
			content: `Error when backing up the server: ${e instanceof Error ? e.message : String(e)}`,
		});
	}
}
