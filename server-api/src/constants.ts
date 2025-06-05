import path from 'path';
import config from '../config.json' with { type: "json" };

export const SERVER_ADDRESS = 'localhost';
export const SERVER_PORT = config.serverPort || 25566;
export const MINECRAFT_PORT = config.minecraftPort || 25565;
export const MC_SERVER_NAME = config.minecraftWorldName || 'minecraft_server';
export const RCON_PORT = config.rconPort || 25575;
export const RCON_PASSWORD = config.rconPassword || '';
export const SECRET_KEY = config.secretKey || '';
export const REMOTE_SHUTDOWN_ENABLED = config.remoteShutdownEnabled === true;
export const SERVER_ROOT_PATH = config.serverRootPath || '/';
export const BACKUP_PATH = config.backupPath || path.join(SERVER_ROOT_PATH, 'backups');
export const DATA_PATH = path.join(SERVER_ROOT_PATH, MC_SERVER_NAME);

export const PRE_START_SCRIPT = config.preStartScript || '';
export const POST_START_SCRIPT = config.postStartScript || '';

export const JAVA_EXECUTABLE = config.javaExecutable || 'java';
export const MINECRAFT_SERVER_ARGS = config.javaArgs || [
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
