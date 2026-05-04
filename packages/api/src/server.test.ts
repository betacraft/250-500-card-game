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

describe('hand-privacy', () => {
  let app: ReturnType<typeof createApp>;
  let url: string;

  beforeEach(async () => {
    app = createApp();
    await new Promise<void>((r) => app.httpServer.listen(0, r));
    const addr = app.httpServer.address() as AddressInfo;
    url = `http://localhost:${addr.port}`;
  });

  afterEach(async () => {
    app.io.close();
    await new Promise<void>((r) => app.httpServer.close(() => r()));
  });

  it('game:state-updated never includes any player hands; private hands go only to owning socket', async () => {
    // Connect 6 clients, fill the room, start a 250 hand, capture all events for client A
    const clients = Array.from({ length: 6 }, () => ioClient(url, { transports: ['websocket'], reconnection: false }));
    await Promise.all(clients.map((c) => new Promise<void>((r) => c.on('connect', () => r()))));

    const aliceEvents: Array<{ event: string; payload: unknown }> = [];
    clients[0]!.onAny((event: string, payload: unknown) => aliceEvents.push({ event, payload }));

    clients[0]!.emit('room:create', { gameType: '250', hostName: 'Alice' });
    const created = await waitForEvent<{ room: { code: string } }>(clients[0]!, 'room:created');
    const code = created.room.code;

    for (let i = 1; i < 6; i++) {
      clients[i]!.emit('room:join', { code });
      await waitForEvent(clients[i]!, 'room:joined');
      clients[i]!.emit('room:claim-seat', { seat: i + 1, name: `P${i + 1}` });
      await waitForEvent(clients[i]!, 'room:seat-claimed');
    }
    clients[0]!.emit('game:start-hand', {});
    // Wait for the hand to be dealt and state broadcast
    await waitForEvent(clients[0]!, 'game:state-updated');
    await new Promise((r) => setTimeout(r, 100));

    // Alice should have received exactly one game:hand-dealt addressed to her (her own hand)
    const handDealtEvents = aliceEvents.filter((e) => e.event === 'game:hand-dealt');
    expect(handDealtEvents.length).toBe(1);

    // No game:state-updated payload should contain a `hands` field
    const stateEvents = aliceEvents.filter((e) => e.event === 'game:state-updated');
    expect(stateEvents.length).toBeGreaterThan(0);
    for (const evt of stateEvents) {
      expect(evt.payload).not.toHaveProperty('hands');
      // It SHOULD have cardsPerPlayer (counts only)
      expect(evt.payload).toHaveProperty('cardsPerPlayer');
    }

    clients.forEach((c) => c.disconnect());
  });
});
