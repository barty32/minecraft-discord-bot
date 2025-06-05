import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { WSMessageType, WSMessage } from './types.js';
import { SECRET_KEY } from './constants.js';


export class WebSocketHandler {
	server: WebSocketServer;
	clients: Map<string, WebSocket> = new Map();

	constructor(express: Server, path: string) {
		this.server = new WebSocketServer({
			//server: express,
			noServer: true,
			path: path,
		});

		express.on('upgrade', (request, socket, head) => {
			if(request.headers["key"] !== SECRET_KEY) return;
			this.server.handleUpgrade(request, socket, head, (websocket) => {
				this.server.emit('connection', websocket, request);
			});
		});

		this.server.on('connection', async (ws, _req) => {
			console.log('New WebSocket connection established.');
			this.clients.get(ws.url)?.terminate()
			ws.on('close', () => {
				this.clients.delete(ws.url);
			});
			this.clients.set(ws.url, ws);
		});
	}

	public async send<T>(type: WSMessageType, message: T, responseTo?: string, issuedBy?: string) {
		const payload = JSON.stringify({
			type: type,
			content: message,
			responseTo: responseTo,
			issuedBy: issuedBy,
		} as WSMessage<T>);

		for (const client of this.clients) {
			client[1].send(payload);
		}
	}
}
