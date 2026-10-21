import { getTenantToken } from '@/lib/api/client';
import { getTenantWsUrl } from '@/lib/config';

export type TenantWsMessage = {
  type?: string;
  event?: string;
  payload?: Record<string, unknown>;
};

type MessageListener = (message: TenantWsMessage) => void;
type StateListener = (state: 'connecting' | 'connected' | 'disconnected') => void;

let ws: WebSocket | null = null;
let subscriberCount = 0;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let intentionallyClosed = false;
let connectGeneration = 0;

const messageListeners = new Set<MessageListener>();
const stateListeners = new Set<StateListener>();

function setState(state: 'connecting' | 'connected' | 'disconnected') {
  for (const listener of stateListeners) {
    listener(state);
  }
}

function notifyMessage(message: TenantWsMessage) {
  for (const listener of messageListeners) {
    listener(message);
  }
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
}

function scheduleReconnect() {
  if (intentionallyClosed || subscriberCount === 0) return;
  const delay = Math.min(30_000, 1_000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  setState('disconnected');
  clearReconnectTimer();
  reconnectTimer = setTimeout(connect, delay);
}

function connect() {
  if (typeof window === 'undefined' || subscriberCount === 0) return;

  const token = getTenantToken();
  if (!token) {
    setState('disconnected');
    return;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  intentionallyClosed = false;
  clearReconnectTimer();
  const generation = ++connectGeneration;
  setState('connecting');

  const socket = new WebSocket(getTenantWsUrl(token));
  ws = socket;

  socket.onopen = () => {
    if (generation !== connectGeneration || socket !== ws) return;
    reconnectAttempt = 0;
  };

  socket.onmessage = (event) => {
    if (generation !== connectGeneration || socket !== ws) return;
    try {
      const message = JSON.parse(event.data as string) as TenantWsMessage;
      if (message.type === 'connected') {
        setState('connected');
        return;
      }
      notifyMessage(message);
    } catch {
      // ignore malformed frames
    }
  };

  socket.onerror = () => {
    if (generation !== connectGeneration || socket !== ws) return;
    socket.close();
  };

  socket.onclose = () => {
    if (socket !== ws) return;
    ws = null;
    if (intentionallyClosed || subscriberCount === 0) {
      setState('disconnected');
      return;
    }
    scheduleReconnect();
  };
}

function disconnect() {
  intentionallyClosed = true;
  connectGeneration += 1;
  clearReconnectTimer();
  if (ws) {
    const socket = ws;
    ws = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
    socket.onopen = null;
    socket.close();
  }
  setState('disconnected');
}

export function subscribeTenantRealtime(
  onMessage: MessageListener,
  onState?: StateListener,
): () => void {
  subscriberCount += 1;
  messageListeners.add(onMessage);
  if (onState) {
    stateListeners.add(onState);
  }

  connect();

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    messageListeners.delete(onMessage);
    if (onState) {
      stateListeners.delete(onState);
    }
    if (subscriberCount === 0) {
      disconnect();
    }
  };
}
