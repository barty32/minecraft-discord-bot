import path from 'path';

export const SERVER_ADDRESS = 'localhost';
export const SERVER_PORT = parseInt(process.env.SERVER_PORT || '25566');
export const MINECRAFT_PORT = parseInt(process.env.MINECRAFT_PORT || '25565');
export const MC_SERVER_NAME = process.env.MINECRAFT_WORLD_NAME || 'minecraft_server';
export const RCON_PORT = parseInt(process.env.RCON_PORT || '25575');
export const RCON_PASSWORD = process.env.RCON_PASSWORD || '';
export const SECRET_KEY = process.env.SECRET_KEY || '';
export const REMOTE_SHUTDOWN_ENABLED = process.env.REMOTE_SHUTDOWN_ENABLED === 'true';
export const SERVER_ROOT_PATH = process.env.SERVER_ROOT_PATH || '/';
export const BACKUP_PATH = path.join(SERVER_ROOT_PATH, 'backups');
export const DATA_PATH = path.join(SERVER_ROOT_PATH, MC_SERVER_NAME);
export const JAVA_EXECUTABLE = process.env.JAVA_EXECUTABLE || 'java';
export const MINECRAFT_SERVER_ARGS = [
	'-Xmx7G',
	'-XX:ParallelGCThreads=2',
	'-XX:+UseConcMarkSweepGC',
	'-XX:+UseParNewGC',
	'-jar',
	'forge-server.jar',
	'-Dfml.readTimeout=180',
	'-Dfml.queryResult=confirm',
	'-Dlog4j.configurationFile=log4j2_112-116.xml',
	'nogui',
];
