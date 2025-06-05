import WS from 'ws';
import { SECRET_KEY, WS_ADDRESS } from './constants.js';
import { handleWSMessage } from './index.js';
import { isServerAlive } from './util.js';


let wsConnection: WS | null = null;
let isWSOpen = false;

const establishWSConnection = async () => {
	return new Promise<WS>((res, rej) => {
		const retry_rate = 15 * 1000; // 15 seconds
		const call_limit = 10;
		let times_called = 0;
		const attempt = () => {
			times_called++;

			if(times_called > call_limit) {
				rej();
				return;
			}

			const ws = new WS(WS_ADDRESS, {
				headers: { key: SECRET_KEY },
			});

			ws.on('open', () => {
				clearInterval(timer);
				isWSOpen = true;
				res(ws);
			});
		};

		attempt();
		const timer = setInterval(attempt, retry_rate);
	});
};

export const connectToWS = async () => {

	if(!await isServerAlive())
		throw new Error('The server is offline.');
	
	console.log('Connecting to WebSocket server...');
	
	if(wsConnection || isWSOpen) return null;

	// const embed = new EmbedBuilder()
	// 	.setTitle('Connecting')
	// 	.setDescription(`Response to command: ${_cmd}, issued by @${_usr}.`)
	// 	.addFields([{ name: '\u200B', value: 'Connecting to the server.' }]);
	// command_channel.send({
	// 	embeds: [embed],
	// });

	wsConnection = await establishWSConnection().catch(() => {
		return null;
	});
	if(!wsConnection) {
		// const embed = new EmbedBuilder()
		// 	.setColor('#FF0000')
		// 	.setTitle('Error')
		// 	.setDescription('Fatal error occured while connecting to the server.');

		// command_channel.send({ embeds: [embed] });
		return null;
	}
	new Promise((_, rej) => {
		wsConnection?.on('error', () => rej()).on('close', () => rej());
	}).catch(async () => {
		isWSOpen = false;
		wsConnection?.terminate();
		wsConnection?.removeAllListeners('message');
		wsConnection = null;
	});

	{
		// const embed = new EmbedBuilder()
		// 	.setTitle('Connected')
		// 	.setDescription(`Response to command: ${_cmd}, issued by @${_usr}.`)
		// 	.addFields([{ name: '\u200B', value: 'Connected to the server.' }]);
		// command_channel.send({
		// 	embeds: [embed],
		// });
	}
	console.log('Connected to WebSocket server.');

	// wsConnection!.on('message', messageHandler);
	wsConnection.on('message', handleWSMessage);

	return null;
};