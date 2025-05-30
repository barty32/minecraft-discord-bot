import path from 'path';
import fs from 'fs';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { BACKUP_PATH, DATA_PATH, MC_SERVER_NAME } from './constants.js';
import { query } from './index.js';
import { error, spawnSyncProcess } from './util.js';


export const makeBackupName = (id: string) => MC_SERVER_NAME + id;

export function makeBackupFile(filename?: string): [string, ChildProcessWithoutNullStreams] {
	if(!filename) {
		filename = makeBackupName(Date.now().toString());
	}
	const fullName = `${filename}.tar.gz`;
	return [
		fullName,
		spawn('tar', ['-zcf', path.join(BACKUP_PATH, fullName), MC_SERVER_NAME]),
	];
}

export async function createBackup(): Promise<string> {
	return new Promise((res, rej) => {
		const time = Date.now();
		const id = time.toString();
		const fileName = makeBackupName(id);
		const [backupName, backup_process] = makeBackupFile(fileName);
		backup_process.on('close', async () => {
			try {
				const fullPath = path.join(BACKUP_PATH, backupName);
				const size = fs.statSync(fullPath).size;
				await query(
					`INSERT INTO backups VALUES (${time}, "${backupName}", "${new Date().toISOString()}", ${size})`,
					'run'
				)
				res(id);
			} catch(e) {
				error(e);
				rej('Failed to create a backup. Database error.');
			}
		});
	});
}

export async function getBackup(id: string) {
	try {
		const file = await query(`SELECT "name" FROM backups WHERE id=${id} LIMIT 1`);
		if(!Array.isArray(file) || file.length === 0) 
			throw new Error(`Backup with id '${id}' is not in the database.`);

		const fullPath = path.join(BACKUP_PATH, file[0].name);

		if(!fs.existsSync(fullPath))
			throw new Error(`"Backup file does not exist.`);

		return fullPath;
	} catch(e) {
		error(e);
		throw new Error(`Backup '${id}' was not found.`);
	}
}

export async function loadBackup(id: string) {
	const fullPath = await getBackup(id);
	const backupName = path.join(DATA_PATH + '_backup');
	try {
		// delete any leftovers
		if(fs.existsSync(backupName)) {
			fs.rmSync(backupName, { recursive: true });
		}
		// create backup of the current directory
		fs.renameSync(DATA_PATH, backupName);
		fs.mkdirSync(DATA_PATH);

		// untar the backup archive into the data directory
		await spawnSyncProcess('tar', [
			'-zxf',
			fullPath,
			MC_SERVER_NAME,
		]).catch((e) => {
			throw e;
		});

		fs.rmSync(backupName, { recursive: true });
	} catch(e) {
		fs.renameSync(backupName, DATA_PATH);
		throw e;
	}
}

// auto backup the minecraft world
export async function autoBackupMCWorld(): Promise<void> {
	return new Promise((res, rej) => {
		const [backupName, backup_process] = makeBackupFile('latest_automatic_backup');
		backup_process.on('close', async () => {
			const fullPath = path.join(BACKUP_PATH, backupName);
			const size = fs.statSync(fullPath).size;
			await query(`INSERT OR REPLACE INTO backups values
				(0, "${backupName}", "${new Date().toISOString()}", "${size}")
				`, 'run'
			).catch((e) => {
				rej(e);
			});
			res();
		});
	});
}
