import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, DISCORD_TOKEN } from './constants.js';

const commands = [];

const commandsPath = path.join(import.meta.dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
console.log(commandFiles);
// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for(const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = await import(filePath);
	if('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
	} else {
		console.log(`[WARNING] The command at ${file} is missing a required "data" or "execute" property.`);
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(DISCORD_TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(DISCORD_APPLICATION_ID, DISCORD_GUILD_ID),
			{ body: commands },
		) as any[];

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch(error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
