import type { Server } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { authModule } from '../../modules/auth/infrastructure/auth.module';
import { eventBus, type DomainEventMap } from '../events/event-bus';
import { logger } from '../logger/logger';

const TENANT_WS_PATHS = new Set(['/ws/tenant', '/ws/kitchen']);

type TenantClient = WebSocket & { businessId?: string; isAlive?: boolean };

export type TenantRealtimeMessage =
  | {
      type: 'tenant.event';
      event: string;
      businessId: string;
      payload: Record<string, unknown>;
    }
  | { type: 'connected'; businessId: string }
  | { type: 'error'; message: string };

const clients = new Set<TenantClient>();
let wss: WebSocketServer | undefined;
const attachedServers = new WeakSet<Server>();
let listenersRegistered = false;
let heartbeat: ReturnType<typeof setInterval> | undefined;

function broadcastToBusiness(businessId: string, message: TenantRealtimeMessage) {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN && client.businessId === businessId) {
      client.send(payload);
    }
  }
}

function forwardEvent<K extends keyof DomainEventMap>(
  event: K,
  payload: DomainEventMap[K],
) {
  broadcastToBusiness(payload.businessId, {
    type: 'tenant.event',
    event,
    businessId: payload.businessId,
    payload: payload as Record<string, unknown>,
  });
}

function registerEventBridge() {
  if (listenersRegistered) return;

  const events = Object.keys({
    'user.registered': 1,
    'user.logged_in': 1,
    'order.placed': 1,
    'order.status_changed': 1,
    'order.items_added': 1,
    'order.items_removed': 1,
    'order.delivery_updated': 1,
    'order.rider_assigned': 1,
    'order.waiter_transferred': 1,
    'order.change_request_created': 1,
    'order.change_request_reviewed': 1,
    'table.status_changed': 1,
    'table.waiter_assigned': 1,
    'reservation.created': 1,
    'reservation.cancelled': 1,
    'promotion.activated': 1,
    'promotion.broadcast': 1,
    'loyalty.points_earned': 1,
    'inventory.stock_changed': 1,
    'inbox.notification_created': 1,
  } satisfies Record<keyof DomainEventMap, 1>) as (keyof DomainEventMap)[];

  for (const event of events) {
    eventBus.on(event, (payload: DomainEventMap[typeof event]) => {
      forwardEvent(event, payload);
    });
  }

  listenersRegistered = true;
}

function handleConnection(socket: WebSocket, req: import('http').IncomingMessage) {
  const client = socket as TenantClient;
  client.isAlive = true;
  clients.add(client);

  client.on('pong', () => {
    client.isAlive = true;
  });

  client.on('close', () => {
    clients.delete(client);
    logger.debug({ businessId: client.businessId }, 'Tenant WebSocket disconnected');
  });

  void (async () => {
    try {
      const host = req.headers.host ?? 'localhost';
      const url = new URL(req.url ?? '/ws/tenant', `http://${host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        client.send(JSON.stringify({ type: 'error', message: 'Access token missing' }));
        client.close(4401, 'Unauthorized');
        return;
      }

      const payload = authModule.tokenService.verifyAccessToken(token);
      if (!payload.businessId) {
        client.send(JSON.stringify({ type: 'error', message: 'Tenant access required' }));
        client.close(4403, 'Forbidden');
        return;
      }

      if (await authModule.businessRepository.isSuspended(payload.businessId)) {
        client.send(JSON.stringify({ type: 'error', message: 'Business suspended' }));
        client.close(4403, 'Business suspended');
        return;
      }

      client.businessId = payload.businessId;
      client.send(
        JSON.stringify({
          type: 'connected',
          businessId: payload.businessId,
        } satisfies TenantRealtimeMessage),
      );

      logger.debug({ businessId: payload.businessId }, 'Tenant WebSocket connected');
    } catch {
      client.send(JSON.stringify({ type: 'error', message: 'Invalid access token' }));
      client.close(4401, 'Unauthorized');
    }
  })();
}

export function attachTenantWebSocket(server: Server) {
  registerEventBridge();

  if (!wss) {
    wss = new WebSocketServer({ noServer: true });
    wss.on('connection', handleConnection);
  }

  if (attachedServers.has(server)) {
    return;
  }
  attachedServers.add(server);

  server.on('upgrade', (request, socket, head) => {
    const host = request.headers.host ?? 'localhost';
    const pathname = new URL(request.url ?? '/', `http://${host}`).pathname;

    if (!TENANT_WS_PATHS.has(pathname)) {
      return;
    }

    wss!.handleUpgrade(request, socket, head, (ws) => {
      wss!.emit('connection', ws, request);
    });
  });

  if (!heartbeat) {
    heartbeat = setInterval(() => {
      for (const client of clients) {
        if (!client.isAlive) {
          clients.delete(client);
          client.terminate();
          continue;
        }
        client.isAlive = false;
        client.ping();
      }
    }, 30_000);
  }

  logger.info({ paths: [...TENANT_WS_PATHS] }, 'Tenant WebSocket server ready');
}

/** @deprecated Use attachTenantWebSocket */
export const attachKitchenWebSocket = attachTenantWebSocket;
