import { io } from 'socket.io-client';

const SOCKET_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function createGameSocket() {
  return io(SOCKET_BASE, {
    transports: ['websocket', 'polling'],
    auth: {
      token: localStorage.getItem('token') || ''
    },
    autoConnect: true
  });
}

export function emitGame(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Game server is not connected yet'));
      return;
    }

    socket.emit(event, payload, (response) => {
      if (response?.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.error || 'Game action failed'));
      }
    });
  });
}
