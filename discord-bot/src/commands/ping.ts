import {
	ButtonInteraction,
	ChatInputCommandInteraction,
	SlashCommandBuilder
} from 'discord.js';

export const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!')

export async function execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {
	await interaction.reply({ content: `Pong` });
}
