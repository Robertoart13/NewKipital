import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Response } from 'express';

export interface AuthzRealtimeEventPayload {
  type: 'permissions.changed';
  reason: string;
  roleId?: number;
  at: string;
}

type ClientConnection = {
  id: number;
  response: Response;
};

@Injectable()
export class AuthzRealtimeService implements OnModuleDestroy {
  private readonly clientsByUser = new Map<number, ClientConnection[]>();
  private connectionSeq = 0;
  private readonly keepAliveTimer: NodeJS.Timeout;

  constructor() {
    this.keepAliveTimer = setInterval(() => {
      this.sendKeepAlive();
    }, 20_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.keepAliveTimer);
    for (const [userId, connections] of this.clientsByUser.entries()) {
      for (const connection of connections) {
        if (!connection.response.writableEnded) {
          connection.response.end();
        }
      }
      this.clientsByUser.delete(userId);
    }
  }

  register(userId: number, response: Response): () => void {
    const id = ++this.connectionSeq;
    const current = this.clientsByUser.get(userId) ?? [];
    const next = [...current, { id, response }];
    this.clientsByUser.set(userId, next);

    this.writeEvent(response, 'connected', {
      type: 'connected',
      at: new Date().toISOString(),
    });

    return () => {
      this.unregister(userId, id);
    };
  }

  notifyUsers(userIds: number[], payload: AuthzRealtimeEventPayload): void {
    if (userIds.length === 0) return;
    const targetIds = [...new Set(userIds)].filter((id) => Number.isInteger(id) && id > 0);
    if (targetIds.length === 0) return;

    for (const userId of targetIds) {
      const connections = this.clientsByUser.get(userId) ?? [];
      const aliveConnections: ClientConnection[] = [];

      for (const connection of connections) {
        if (connection.response.writableEnded) {
          continue;
        }
        this.writeEvent(connection.response, payload.type, payload);
        aliveConnections.push(connection);
      }

      if (aliveConnections.length > 0) {
        this.clientsByUser.set(userId, aliveConnections);
      } else {
        this.clientsByUser.delete(userId);
      }
    }
  }

  private unregister(userId: number, connectionId: number): void {
    const current = this.clientsByUser.get(userId) ?? [];
    const next = current.filter((item) => item.id !== connectionId);
    if (next.length > 0) {
      this.clientsByUser.set(userId, next);
    } else {
      this.clientsByUser.delete(userId);
    }
  }

  private sendKeepAlive(): void {
    for (const [userId, connections] of this.clientsByUser.entries()) {
      const aliveConnections: ClientConnection[] = [];
      for (const connection of connections) {
        if (connection.response.writableEnded) {
          continue;
        }
        connection.response.write(': ping\n\n');
        aliveConnections.push(connection);
      }

      if (aliveConnections.length > 0) {
        this.clientsByUser.set(userId, aliveConnections);
      } else {
        this.clientsByUser.delete(userId);
      }
    }
  }

  private writeEvent(response: Response, eventName: string, payload: unknown): void {
    if (response.writableEnded) return;
    response.write(`event: ${eventName}\n`);
    response.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}
