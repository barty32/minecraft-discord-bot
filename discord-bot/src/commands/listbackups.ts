import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	ContainerBuilder,
	MessageFlags,
	SlashCommandBuilder,
	TextDisplayBuilder
} from 'discord.js';
import { formatSize, sendRequest } from '../util.js';
import { connectToWS } from '../websocket.js';
import { SERVER_API } from '../constants.js';

export const data = new SlashCommandBuilder()
	.setName('listbackups')
	.setDescription('Prints a list of stored world backups')

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {

	const reply = await interaction.deferReply({
		flags: MessageFlags.Ephemeral,
	});

	try {
		await connectToWS();
		const response = JSON.parse(await sendRequest('GET', '/api/backups'));
		if(response.error !== false)
			throw new Error(response.message);
		
		if(response.result.length === 0) {
			reply.edit({
				content: `No backups were found.`,
			});
			return;
		}

		const containers = [];

		for(const backup of response.result) {
			const id = backup.id.toString();
			const date = backup.date;
			const size = backup.size;

			const wakeUp = new ButtonBuilder()
				.setCustomId('loadbackup:' + id)
				.setLabel('Load')
				.setStyle(ButtonStyle.Primary);
			
			const shutdown = new ButtonBuilder()
				.setURL(`${SERVER_API}/api/backup/${id}`)
				.setLabel('Download')
				.setStyle(ButtonStyle.Link);

			containers.push(new ContainerBuilder()
				.addTextDisplayComponents(new TextDisplayBuilder({ content: '### ' + new Date(date).toLocaleString() }))
				.addTextDisplayComponents(new TextDisplayBuilder({ content: id === '0' ? 'Latest automatic backup' : ('ID: ' + id) }))
				.addTextDisplayComponents(new TextDisplayBuilder({ content: 'Size: ' + formatSize(size) }))
				.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>()
					.addComponents(wakeUp, shutdown)));
		}
		if(containers.length > 5) {
			//only 40 components are allowed in one message, so needs to be split into multiple messages
			for(let i = 0; i < containers.length; i += 5) {
				interaction.followUp({
					flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
					components: containers.slice(i, i + 5),
				})
			}
		}
		else {
			reply.edit({
				flags: MessageFlags.IsComponentsV2,
				components: containers,
			});
		}
	} catch(e) {
		reply.edit({
			content: `Error when backing up the server: ${e instanceof Error ? e.message : String(e)}`,
		});
	}
}
