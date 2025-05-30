import { exec, spawn } from 'child_process';
import { REMOTE_SHUTDOWN_ENABLED, SECRET_KEY } from './constants.js';


export const shutdown = () => REMOTE_SHUTDOWN_ENABLED && exec('shutdown now');

export const spawnSyncProcess = (command: string, args: string[]) => {
	return new Promise((res, rej) => {
		const process = spawn(command, args);
		process
		.on('close', res)
		.on('disconnect', res)
		.on('exit', res)
		.on('error', rej);
	});
};

export function authentication(req: any, res: any, next: any) {
	const key = req.header('key');
	if(!key || key !== SECRET_KEY)
		return res.status(401).send('Not authenticated.');

	next();
};

const formatLog = (msg: string) => `[${new Date().toISOString()}] - ${msg}`;
export const log = (msg: string) => console.log(formatLog(msg));
export const error = (msg: string) => console.error(formatLog(msg));
