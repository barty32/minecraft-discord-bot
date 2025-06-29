import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import util from "minecraft-server-util";
import { Rcon } from "rcon-client"
import { JAVA_EXECUTABLE, MINECRAFT_PORT, MINECRAFT_SERVER_ARGS, POST_START_SCRIPT, PRE_START_SCRIPT, RCON_PASSWORD, RCON_PORT, SERVER_ADDRESS } from "./constants.js";
import { error, log } from "./util.js";
import { ServerStatus } from "./types.js";



export class MinecraftServer {
	status = ServerStatus.Offline;
	onStatusUpdate?: (status: ServerStatus) => void;
	process: ChildProcessWithoutNullStreams | null = null;

	public getStatus() {
		return this.status;
	}

	private setStatus(status: ServerStatus) {
		this.status = status;
		this.onStatusUpdate?.(this.status);
	}

	public async getMinecraftStatus() {
		return await util.status(SERVER_ADDRESS, MINECRAFT_PORT);
	}

	public start() {
		return new Promise<void>((res, rej) => {
			if(PRE_START_SCRIPT) {
				log(`Running pre-start script: ${PRE_START_SCRIPT}`);
				try {
					exec(PRE_START_SCRIPT);
				} catch(e) {
					error(`Failed to run pre-start script: ${e instanceof Error ? e.message : String(e)}`);
				}
			}
			
			this.process = spawn(JAVA_EXECUTABLE, MINECRAFT_SERVER_ARGS);
			this.process.stdout.setEncoding('utf8');
			
			this.setStatus(ServerStatus.Starting);

			// default 'close' event listener
			this.process.on('close', (code) => {
				this.setStatus(ServerStatus.Offline);
				if(code === 0) res();
				else rej(`Server process exited with code: ${code}`);
			});
			this.process.on('error', (err) => {
				log(`Server process error: ${err}`);
				this.setStatus(ServerStatus.Offline);
				rej(err);
			});

			// this.process.stdout.addListener('data', (chunk) => {
			// 	//TODO: filter minecraft log
			// 	// const message: WSMessage<string> = { code: 1001, payload: chunk };
			// 	// pub.publish(REDIS_PUBLIC_CHANNEL, JSON.stringify(message));
			// });

			const interval = setInterval(async () => {
				try {
					if(this.status === ServerStatus.Starting) {
						// const client = new RCON();
						// await client.connect(SERVER_ADDRESS, RCON_PORT);
						// client.close();
						await this.getMinecraftStatus();

						// Server is online
						this.setStatus(ServerStatus.Online);

						if(POST_START_SCRIPT) {
							log(`Running post-start script: ${POST_START_SCRIPT}`);
							try {
								exec(POST_START_SCRIPT);
							} catch(e) {
								error(`Failed to run post-start script: ${e instanceof Error ? e.message : String(e)}`);
							}
						}
						res();
					}
					clearInterval(interval);
				} catch(e) {
					// Server is offline
					error(e);
				}
			}, 5000);
		});
	}

	public async stop() {

		if(this.status === ServerStatus.Offline || !this.process)
			throw new Error('The server is offline');
		if(this.status === ServerStatus.Stopping)
			throw new Error('The server is already stopping.');

		this.setStatus(ServerStatus.Stopping);

		// run this only once
		// const handler = () => {
		// 	this.process?.removeListener('close', handler);
		// };
		// // remove default event listener
		// this.process.removeAllListeners('close');
		// this.process.addListener('close', handler);
		
		// this.process.stdout.removeAllListeners('data');
		try {
			await this.sendCommand('stop');
			this.setStatus(ServerStatus.Offline);
		} catch(e) {
			const result = this.process.kill();
			if(result) {
				this.setStatus(ServerStatus.Offline);
			}
		}
		this.process = null;
	}

	public async sendCommand(command: string): Promise<string> {
		try {
			// const client = new RCON();
			// await client.connect(SERVER_ADDRESS, RCON_PORT);
			// await client.login(RCON_PASSWORD);

			// const result = await client.execute(command);
			// await client.close();

			const rcon = new Rcon({ host: SERVER_ADDRESS, port: RCON_PORT, password: RCON_PASSWORD });
			await rcon.connect();

			const result = await rcon.send(command);
			await rcon.end();

			return result;
		} catch(e) {
			error(e);
			throw new Error(`Failed to execute command: '${command}'.`);
		}
	}
}
