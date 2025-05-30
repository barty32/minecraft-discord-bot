export const SERVER_ADDRESS = process.env.SERVER_ADDRESS || 'localhost';
export const SERVER_PORT = 25566;
export const SERVER_API = `http://${SERVER_ADDRESS}:${SERVER_PORT}`;
export const WS_ADDRESS = `ws://${SERVER_ADDRESS}:${SERVER_PORT}/api/ws`;
export const SERVER_MAC = process.env.SERVER_MAC || '';
export const SECRET_KEY = process.env.SECRET_KEY || '';
export const JOIN_MESSAGE = process.env.JOIN_MESSAGE || 'You can join it now!';