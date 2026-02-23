import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface CounterEntry {
  count: number;
  windowStart: number;
}

@Injectable()
export class AuthRateLimitService {
  private readonly counters = new Map<string, CounterEntry>();

  consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const current = this.counters.get(key);

    if (!current || now - current.windowStart >= windowMs) {
      this.counters.set(key, { count: 1, windowStart: now });
      return;
    }

    if (current.count >= limit) {
      throw new HttpException(
        'Demasiados intentos. Intente nuevamente en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
    this.counters.set(key, current);
  }
}
