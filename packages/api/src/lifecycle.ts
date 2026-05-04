import type { Server } from 'node:http';
import type { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';

/** Install SIGTERM/SIGINT handlers that drain rooms and shut down cleanly. */
export function installGracefulShutdown(httpServer: Server, io: SocketIOServer): void {
  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'received shutdown signal — draining');
    io.emit('server:shutting-down', { reason: 'maintenance' });
    io.disconnectSockets(true);
    void io.close();
    httpServer.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('forced exit after 10s');
      process.exit(1);
    }, 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
