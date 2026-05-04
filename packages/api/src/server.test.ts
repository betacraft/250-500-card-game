import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApp } from './server';
import { io as ioClient, type Socket } from 'socket.io-client';
import type { AddressInfo } from 'node:net';

function port(server: import('node:http').Server): number {
  const addr = server.address() as AddressInfo;
  return addr.port;
}

async function waitForEvent<T = unknown>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => {
    socket.once(event, (data: T) => resolve(data));
  });
}

describe('server integration', () => {
  let app: ReturnType<typeof createApp>;
  let url: string;

  beforeEach(async () => {
    app = createApp();
    await new Promise<void>((r) => app.httpServer.listen(0, r));
    url = `http://localhost:${port(app.httpServer)}`;
  });

  afterEach(async () => {
    app.io.close();
    await new Promise<void>((r) => app.httpServer.close(() => r()));
  });

  it('GET /health returns ok with timestamp', async () => {
    const res = await fetch(`${url}/health`);
    const body = (await res.json()) as { status: string; timestamp: string };
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
  });

  it('socket.io accepts connection', async () => {
    const client = ioClient(url, { transports: ['websocket'], reconnection: false });
    await new Promise<void>((r) => client.on('connect', () => r()));
    expect(client.connected).toBe(true);
    client.disconnect();
  });

  it('full lobby flow: host creates, second client joins, both see updated state', async () => {
    const host = ioClient(url, { transports: ['websocket'], reconnection: false });
    const guest = ioClient(url, { transports: ['websocket'], reconnection: false });
    await Promise.all([
      new Promise<void>((r) => host.on('connect', () => r())),
      new Promise<void>((r) => guest.on('connect', () => r())),
    ]);

    host.emit('room:create', { gameType: '250', hostName: 'Host' });
    const created = await waitForEvent<{ room: { code: string; players: { name: string }[] } }>(host, 'room:created');
    expect(created.room.players).toHaveLength(1);
    expect(created.room.players[0]?.name).toBe('Host');

    const code = created.room.code;
    guest.emit('room:join', { code });
    await waitForEvent(guest, 'room:joined');
    const guestSeatedOnHost = new Promise<{ players: { name: string }[] }>((resolve) => {
      const handler = (state: { players: { name: string }[] }) => {
        if (state.players.find((p) => p.name === 'Guest')) {
          host.off('room:state-updated', handler);
          resolve(state);
        }
      };
      host.on('room:state-updated', handler);
    });
    guest.emit('room:claim-seat', { seat: 2, name: 'Guest' });
    const updated = await guestSeatedOnHost;
    expect(updated.players.find((p) => p.name === 'Guest')).toBeTruthy();

    host.disconnect();
    guest.disconnect();
  });

  it('rejects invalid room code with ROOM_NOT_FOUND', async () => {
    const client = ioClient(url, { transports: ['websocket'], reconnection: false });
    await new Promise<void>((r) => client.on('connect', () => r()));
    client.emit('room:join', { code: 'XXXXXX' });
    const err = await waitForEvent<{ code: string }>(client, 'error');
    expect(err.code).toBe('ROOM_NOT_FOUND');
    client.disconnect();
  });

  it('rejects invalid payloads with INVALID_PAYLOAD', async () => {
    const client = ioClient(url, { transports: ['websocket'], reconnection: false });
    await new Promise<void>((r) => client.on('connect', () => r()));
    client.emit('room:create', { gameType: 'invalid' });
    const err = await waitForEvent<{ code: string }>(client, 'error');
    expect(err.code).toBe('INVALID_PAYLOAD');
    client.disconnect();
  });
});
