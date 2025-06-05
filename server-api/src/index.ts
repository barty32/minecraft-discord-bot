import cors from 'cors';
import express from 'express';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import osutil from 'node-os-utils';
import { ComputerStatusUpdate, MinecraftStatusUpdate, ServerStatus, WSMessageType } from './types.js';
import { BACKUP_PATH, SERVER_PORT, SERVER_ROOT_PATH } from './constants.js';
import { MinecraftServer } from './server.js';
import { authentication, error, log, shutdown } from './util.js';
import { WebSocketHandler } from './websocket.js';
import { autoBackupMCWorld, createBackup, getBackup, loadBackup } from './backups.js';

const serverDir = path.join(SERVER_ROOT_PATH);
process.chdir(serverDir);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//sqlite setup
const SQLite = sqlite3.verbose();

try {
	if(!fs.existsSync(BACKUP_PATH)) {
		fs.mkdirSync(BACKUP_PATH, { recursive: true });
		log(`Created backup directory at ${BACKUP_PATH}`);
	}
} catch(e) {
	error(`Failed to create backup directory: ${e instanceof Error ? e.message : String(e)}`);
}

const db = new SQLite.Database(path.join(BACKUP_PATH, 'backups.db'), (err) => {
	if(!err) return;
	error('Failed to connect to the database: ' + err);
});

db.serialize(async () => {
	await query(
		'CREATE TABLE IF NOT EXISTS backups (id INTEGER UNIQUE, name TEXT, date TEXT, size INTEGER)',
		'run'
	);
});

export function query(command: string, method: 'all' | 'run' | 'get' | 'each' | 'prepare' = 'all') {
	return new Promise((resolve, reject) => {
		db[method](command, (error: any, result: any) => {
			if(error) {
				reject(error);
			} else {
				resolve(result);
			}
		});
	});
};

// serve backups without authentication middleware
app.get('/api/backup/:id', async (req, res) => {
	try {
		const fullPath = await getBackup(req.params['id']);
		res.download(fullPath);
	} catch(e) {
		res.status(404).send(e instanceof Error ? e.message : String(e));
	}
});

// get the current server status
app.get('/api/ping', async (_, res) => {
	res.send('pong');
});

app.get('/api/log', (_, res) => {
	res.sendFile(path.join(SERVER_ROOT_PATH, 'logs', 'latest.log'));
});

const MCServer = new MinecraftServer();

MCServer.onStatusUpdate = async (status: ServerStatus) => {
	log(`Server status updated: ${status}`);
	if(status === ServerStatus.Online) {
		wss.send(WSMessageType.Message, '@everyone The server is 🟢 ONLINE.');
		onlineStatusInterval = setInterval(onlineStatusUpdate, 10000);
	}
	onlineStatusUpdate();
}

let onlineStatusInterval: NodeJS.Timeout;
const onlineStatusUpdate = async () => {
	const update: MinecraftStatusUpdate = {
		status: MCServer.getStatus(),
		numPlayers: 0,
		maxPlayers: 0,
	};
	if(MCServer.getStatus() === ServerStatus.Online) {
		try {
			const srv = await MCServer.getMinecraftStatus();
			update.numPlayers = srv.players.online;
			update.maxPlayers = srv.players.max;
		} catch(e) {}
	}
	else {
		clearInterval(onlineStatusInterval);
	}
	wss.send<MinecraftStatusUpdate>(WSMessageType.MinecraftStatusUpdate, update);
}

let computerStatus = ServerStatus.Online;
const computerStatusUpdate = async () => {
	const update: ComputerStatusUpdate = {
		status: computerStatus,
		cpuUsage: -1,
		diskTotal: -1,
		diskUsed: -1,
		ramTotal: -1,
		ramUsed: -1,
	};
	try {
		update.cpuUsage = await osutil.cpu.usage(5000);
		update.ramTotal = osutil.mem.totalMem();
		update.ramUsed = (await osutil.mem.used()).usedMemMb * 1024 * 1024; //result was in MB
		update.diskTotal = parseFloat((await osutil.drive.used('/')).totalGb);
		update.diskUsed = parseFloat((await osutil.drive.used('/')).usedGb);
	} catch(e) { }
	wss.send<ComputerStatusUpdate>(WSMessageType.ComputerStatusUpdate, update);
}
let computerUpdateInterval = setInterval(computerStatusUpdate, 10000);

// apply authentication middleware
app.use(authentication);

// get the current server status
app.get('/api/status', async (_, res) => {
	await onlineStatusUpdate();
	res.send(MCServer.getStatus());
});

// start the server
app.post('/api/start', async (req, res) => {
	if(MCServer.getStatus() !== ServerStatus.Offline) {
		res.send(`The server is not ready. Status: ${MCServer.getStatus()}.`);
		return;
	}

	const command = 'start';
	const author = req.body['author'];
	log('Starting Minecraft server...');
	wss.send(WSMessageType.Message, 'Starting Minecraft server.', command, author);
	try {
		await MCServer.start();
		res.send('OK');
	} catch(e) {
		const msg = e instanceof Error ? e.message : String(e);
		wss.send(WSMessageType.Error, 'Failed to start Minecraft server: ' + msg, command, author);
		res.status(500).send(msg);
	}
});

// stop the server but keep the machine running
app.post('/api/stop', async (req, res) => {
	const command = 'stop';
	const author = req.body['author'];
	log('Gracefully stopping the server.');
	wss.send(WSMessageType.Message, 'Gracefully stopping the server.', command, author);
	try {
		await MCServer.stop();
		wss.send(WSMessageType.Message, 'The server was stopped.', command, author);
		if(req.body['data']?.autobackup ?? true) {
			log('Backing up the world.');
			wss.send(WSMessageType.Message, 'Backing up the world.', command, author);
			await autoBackupMCWorld();
		}
		res.send('OK');
	} catch(e) {
		const msg = e instanceof Error ? e.message : String(e);
		wss.send(WSMessageType.Error, 'Failed to stop the server: ' + msg, command, author);
		res.status(500).send(msg);
	}
});

// restart the MC server
app.post('/api/restart', async (req, res) => {
	if(MCServer.getStatus() !== ServerStatus.Online) {
		res.send("Couldn't restart the server. Make sure the server is running.");
		return;
	}

	const command = 'restart';
	const author = req.body['author'];
	log('Restarting the server.');
	wss.send(WSMessageType.Message, 'Restarting the server.', command, author);
	try {
		await MCServer.stop();
		wss.send(WSMessageType.Message, 'The server was stopped. Restarting...', command, author);
	} catch(e) {
		const msg = e instanceof Error ? e.message : String(e);
		wss.send(WSMessageType.Error, 'Failed to restart the server: ' + msg, command, author);
		res.status(500).send(msg);
		return;
	}

	log('Starting Minecraft server...');
	wss.send(WSMessageType.Message, 'Starting Minecraft server.', command, author);
	try {
		await MCServer.start();
		res.send('OK');
	} catch(e) {
		const msg = e instanceof Error ? e.message : String(e);
		wss.send(WSMessageType.Error, 'Failed to start Minecraft server: ' + msg, command, author);
		res.status(500).send(msg);
	}
});

app.post('/api/shutdown', async (req, res) => {
	if(MCServer.getStatus() === ServerStatus.Stopping) {
		res.send('The server is stopping.');
		return;
	}

	const command = 'shutdown';
	const author = req.body['author'];
	if(MCServer.getStatus() !== ServerStatus.Offline) {
		log('Gracefully stopping the server.');
		wss.send(WSMessageType.Message, 'Gracefully stopping the server.', command, author);
		try {
			await MCServer.stop();
			wss.send(WSMessageType.Message, 'The server was stopped.', command, author);
			if(req.body['data']?.autobackup ?? true) {
				log('Backing up the world.');
				wss.send(WSMessageType.Message, 'Backing up the world.', command, author);
				await autoBackupMCWorld();
			}
		} catch(e) {
			const msg = e instanceof Error ? e.message : String(e);
			wss.send(WSMessageType.Error, 'Failed to stop the server: ' + msg, command, author);
		}
	}

	wss.send(WSMessageType.Message, 'Shutting down the computer.', command, author);
	
	if(shutdown()) {
		computerStatus = ServerStatus.Stopping;
		clearInterval(computerUpdateInterval);
		computerStatusUpdate();
	}

	res.send('OK');
});

// send a command using RCON
app.post('/api/command', async (req, res) => {
	if(!(MCServer.getStatus() === ServerStatus.Online || MCServer.getStatus() === ServerStatus.Starting)) {
		res.send({ error: true, message: "Cannot execute the command, the server is not running." });
		return;
	}
	const command = req.body['data']?.command;
	if(!command) {
		res.send({ error: true, message: 'No command provided.' });
		return;
	}
	try {
		const result = await MCServer.sendCommand(command);
		res.send({ error: false, message: result });
		wss.send(WSMessageType.Message, `Command '${command}' was executed, response: ${result}`, 'cmd', req.body['author']);
	}
	catch(e) {
		error(e);
		res.send({ error: true, message: `Failed to execute command: '${command}'.` });
	}
});

// get all available backups
app.get('/api/backups', async (_, res) => {
	try {
		const result = await query('SELECT * FROM backups').catch((e) => {
			throw e;
		});
		res.json({ error: false, result });
	} catch(e) {
		res.json({ error: true, message: 'Failed to query database.' });
	}
});

// create a backup of the current world
app.post('/api/backup', async (req, res) => {
	if(MCServer.getStatus() !== ServerStatus.Offline) {
		res.send('Cannot create backup when the server is running.');
		return;
	}

	const command = 'backup';
	const author = req.body['author'];
	log('Backing up the world.');
	wss.send(WSMessageType.Message, 'Backing up the world.', command, author);
	try {
		const id = await createBackup();
		log(`Backup '${id}' was created.`);
		wss.send(WSMessageType.Message, `Backup '${id}' was created.`, command, author);
		res.send('OK');
	} catch(e) {
		const msg = e instanceof Error ? e.message : String(e);
		error(`Failed to create the backup: ${msg}`);
		wss.send(WSMessageType.Error, `Failed to create the backup: ${msg}`, command, author);
		res.send(msg);
	}
});

// load a backup
app.post('/api/backup/load/:id', async (req, res) => {
	if(MCServer.getStatus() !== ServerStatus.Offline) {
		res.send('Cannot load backup when the server is running. Stop it first.');
		return;
	}
	const command = 'loadbackup';
	const author = req.body['author'];
	const id = req.params['id'];
	log(`Loading backup '${id}'.`);
	wss.send(WSMessageType.Message, `Loading backup '${id}'.`, command, author);
	try {
		await loadBackup(id);
		log(`The backup '${id}' was loaded.`);
		wss.send(WSMessageType.Message, `The backup '${id}' was loaded.`, command, author);
		res.send('OK');
	} catch(e) {
		const msg = e instanceof Error ? e.message : String(e);
		error(`Failed to load the backup: ${msg}`);
		wss.send(WSMessageType.Error, `Failed to load the backup: ${msg}`, command, author);
		res.send(msg);
	}
});

const s = app.listen(SERVER_PORT, () => {
	log(`Server listening at http://localhost:${SERVER_PORT}`);
});

export const wss = new WebSocketHandler(s, '/api/ws');
