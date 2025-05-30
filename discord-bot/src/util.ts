import ping from 'ping';
import wol from 'wol';
import {
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ContainerBuilder,
	RGBTuple,
	MessageFlags
} from 'discord.js';
import { JOIN_MESSAGE, SECRET_KEY, SERVER_ADDRESS, SERVER_API, SERVER_MAC } from './constants.js';
import { ComputerStatusUpdate, MinecraftStatusUpdate, ServerStatus } from './types.js';
import { computerStatus, controlChannel, serverStatus } from './index.js';


export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function formatSize(size: number) {
	if(size < 1024) return `${size} B`;
	if(size < 1024 * 1024) return `${(size / 1024).toFixed(2)} kB`;
	if(size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
	if(size < 1024 * 1024 * 1024 * 1024) return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
	return `${(size / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
}

function formatStatus(status: ServerStatus) {
	let statusMessage;
	let accentColor: RGBTuple;
	switch(status) {
		case ServerStatus.Online:
			statusMessage = '🟢 ONLINE';
			accentColor = [0, 255, 0];
			break;
		case ServerStatus.Starting:
			statusMessage = '🟠 STARTING';
			accentColor = [255, 165, 0];
			break;
		case ServerStatus.Stopping:
			statusMessage = '🟠 STOPPING';
			accentColor = [255, 165, 0];
			break;
		default:
			statusMessage = '🔴 OFFLINE';
			accentColor = [255, 0, 0];
			break;
	}
	return {
		statusMessage,
		accentColor,
	}
}

export function createControlPanel(status: MinecraftStatusUpdate, computerStatus: ComputerStatusUpdate) {

	let startStop;
	if([ServerStatus.Offline, ServerStatus.Starting].includes(status.status)) {
		startStop = new ButtonBuilder()
			.setCustomId('start')
			.setLabel('Start')
			.setStyle(ButtonStyle.Success)
			.setDisabled(status.status === ServerStatus.Starting);
	}
	else {
		startStop = new ButtonBuilder()
			.setCustomId('stop')
			.setLabel('Stop')
			.setStyle(ButtonStyle.Danger)
			.setDisabled(status.status === ServerStatus.Stopping);
	}

	const restart = new ButtonBuilder()
		.setCustomId('restart')
		.setLabel('Restart')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(status.status !== ServerStatus.Online);

	const backup = new ButtonBuilder()
		.setCustomId('backup')
		.setLabel('Backup')
		.setStyle(ButtonStyle.Primary)
		.setDisabled(computerStatus.status !== ServerStatus.Online);

	const listBackups = new ButtonBuilder()
		.setCustomId('listbackups')
		.setLabel('List backups')
		.setStyle(ButtonStyle.Secondary)
		.setDisabled(computerStatus.status !== ServerStatus.Online);
	
	const log = new ButtonBuilder()
		.setURL(SERVER_API + '/api/log')
		.setLabel('Log')
		.setStyle(ButtonStyle.Link);

	const wakeUp = new ButtonBuilder()
		.setCustomId('wakeup')
		.setLabel('Wake up')
		.setStyle(ButtonStyle.Primary)
		.setDisabled(computerStatus.status !== ServerStatus.Offline);

	const shutdown = new ButtonBuilder()
		.setCustomId('shutdown')
		.setLabel('Shutdown')
		.setStyle(ButtonStyle.Danger)
		.setDisabled(computerStatus.status !== ServerStatus.Online);

	const computerRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(wakeUp, shutdown);

	const serverRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(startStop, restart, backup, listBackups, log);

	const computerContainer = new ContainerBuilder()
		.setAccentColor(formatStatus(computerStatus.status).accentColor)
		.addTextDisplayComponents(new TextDisplayBuilder({ content: '# Computer' }))
		.addTextDisplayComponents(new TextDisplayBuilder({ content: formatStatus(computerStatus.status).statusMessage }));
	
	if(computerStatus.status === ServerStatus.Online) {
		if(computerStatus.cpuUsage) {
			computerContainer.addTextDisplayComponents(new TextDisplayBuilder({
				content: `CPU: ${computerStatus.cpuUsage}%`
			}));
		}
		if(computerStatus.ramTotal && computerStatus.ramUsed) {
			computerContainer.addTextDisplayComponents(new TextDisplayBuilder({
				content: `RAM: ${formatSize(computerStatus.ramUsed)} of ${formatSize(computerStatus.ramTotal)} (${(computerStatus.ramUsed / computerStatus.ramTotal * 100).toFixed(1)}%)`
			}));
		}
		if(computerStatus.diskTotal && computerStatus.diskUsed) {
			computerContainer.addTextDisplayComponents(new TextDisplayBuilder({
				content: `Disk: ${computerStatus.diskUsed} GB of ${computerStatus.diskTotal} GB (${(computerStatus.diskUsed / computerStatus.diskTotal * 100).toFixed(1)}%)`
			}));
		}
	}
	computerContainer
		.addSeparatorComponents(new SeparatorBuilder())
		.addActionRowComponents(computerRow);

	const serverContainer = new ContainerBuilder()
		.setAccentColor(formatStatus(status.status).accentColor)
		.addTextDisplayComponents(new TextDisplayBuilder({ content: '# Minecraft Server' }))
		.addTextDisplayComponents(new TextDisplayBuilder({ content: formatStatus(status.status).statusMessage }))
	if(status.status === ServerStatus.Online) {
		if(status.maxPlayers) {
			serverContainer.addTextDisplayComponents(new TextDisplayBuilder({ content: `${status.numPlayers} / ${status.maxPlayers} players are online` }))
		}
		serverContainer.addTextDisplayComponents(new TextDisplayBuilder({ content: JOIN_MESSAGE }))
	}
	serverContainer
		.addSeparatorComponents(new SeparatorBuilder())
		.addActionRowComponents(serverRow);

	return [computerContainer, serverContainer];
}

export async function sendControlPanel(serverStatus: MinecraftStatusUpdate, computerStatus: ComputerStatusUpdate) {
	try {
		const msg = await controlChannel?.messages.fetch(controlChannel.lastMessageId ?? '');
		if(!msg) throw new Error('');
		msg.edit({
			flags: MessageFlags.IsComponentsV2,
			components: createControlPanel(serverStatus, computerStatus),
		});
	} catch(e) {
		controlChannel?.send({
			flags: MessageFlags.IsComponentsV2,
			components: createControlPanel(serverStatus, computerStatus),
		});
	}
}

export async function sendRequest(method: 'GET' | 'POST' | 'DELETE' | 'PUT', path: string, body?: any) {
	return fetch(SERVER_API + path, {
		method,
		headers: {
			'Content-Type': 'application/json',
			//'Accept': 'application/json',
			key: SECRET_KEY,
		},
		body,
	}).then((response) => response.text());
}

export const isServerAlive = async () => {
	return await new Promise((resolve) => {
		ping.sys.probe(SERVER_ADDRESS, (isAlive) => {
			if(isAlive) {
				fetch(SERVER_API + '/api/ping', {
					headers: {
						key: SECRET_KEY!,
					},
				})
					.then(() => resolve(true))
					.catch((e) => resolve(false));
				return;
			}
			resolve(false);
		});
	});
}

export async function wakeUpComputer() {
	await wol.wake(SERVER_MAC, (_err, _res) => { });
	computerStatus.status = ServerStatus.Starting;
	sendControlPanel(serverStatus, computerStatus);
	await new Promise((res, rej) => {
		let numTries = 20;
		const int = setInterval(async () => {
			const alive = await isServerAlive();
			if(alive) {
				clearInterval(int);
				res(true);
			}
			else if(--numTries <= 0) {
				clearInterval(int);
				computerStatus.status = ServerStatus.Offline;
				sendControlPanel(serverStatus, computerStatus);
				rej("Failed to wake up the computer.");
			}
		}, 5000);
	});
}
