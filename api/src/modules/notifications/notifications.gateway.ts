import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { COOKIE_NAME } from '../../config/cookie.config.js';

const USER_ROOM_PREFIX = 'user:';

function parseCookie(header: string | string[] | undefined): Record<string, string> {
  const str = Array.isArray(header) ? header[0] : header ?? '';
  return Object.fromEntries(
    str.split(';').map((s) => {
      const [k, v] = s.trim().split('=').map((x) => x.trim());
      return [k, v ?? ''];
    }),
  );
}

@WebSocketGateway({
  path: '/socket.io',
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly userSockets = new Map<number, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    const cookieHeader = (client.handshake?.headers as Record<string, string> | undefined)?.cookie;
    const cookies = parseCookie(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) {
      client.emit('error', { message: 'No autorizado' });
      return;
    }
    try {
      const payload = this.jwt.verify(token, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
      const userId = payload?.sub ? Number(payload.sub) : NaN;
      if (!userId || Number.isNaN(userId)) {
        client.emit('error', { message: 'Token inválido' });
        return;
      }
      const room = USER_ROOM_PREFIX + userId;
      client.join(room);
      const set = this.userSockets.get(userId) ?? new Set();
      set.add(client.id);
      this.userSockets.set(userId, set);
    } catch {
      client.emit('error', { message: 'Token inválido o expirado' });
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets) {
      if (sockets.delete(client.id) && sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  emitNewNotification(userId: number, idNotificacion: number): void {
    this.server.to(USER_ROOM_PREFIX + userId).emit('notification:new', { idNotificacion });
  }

  emitCountUpdate(userId: number): void {
    this.server.to(USER_ROOM_PREFIX + userId).emit('notification:count-update');
  }

  emitNotificationUpdate(userId: number): void {
    this.server.to(USER_ROOM_PREFIX + userId).emit('notification:list-update');
  }
}
