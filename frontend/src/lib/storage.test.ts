import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredCompanyId,
  getStoredActiveApp,
  clearStorage,
  setSkipRestore,
  shouldSkipRestore,
  clearSkipRestore,
  setMicrosoftSession,
  getMicrosoftAccessToken,
  clearMicrosoftSession,
  setMicrosoftAvatar,
  getMicrosoftAvatar,
  clearMicrosoftAvatar,
  STORAGE_KEYS,
} from './storage';

function createFunctionalStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

describe('storage utils', () => {
  let localStore: Storage;
  let sessionStore: Storage;

  beforeEach(() => {
    localStore = createFunctionalStorage();
    sessionStore = createFunctionalStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: localStore, writable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStore, writable: true });
  });

  it('getStoredCompanyId returns stored value', () => {
    localStorage.setItem(STORAGE_KEYS.COMPANY_ID, '5');
    expect(getStoredCompanyId()).toBe('5');
  });

  it('getStoredCompanyId returns null when empty', () => {
    expect(getStoredCompanyId()).toBeNull();
  });

  it('getStoredActiveApp returns stored value', () => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_APP, 'timewise');
    expect(getStoredActiveApp()).toBe('timewise');
  });

  it('clearStorage removes company and app', () => {
    localStorage.setItem(STORAGE_KEYS.COMPANY_ID, '1');
    localStorage.setItem(STORAGE_KEYS.ACTIVE_APP, 'kpital');
    clearStorage();
    expect(localStorage.getItem(STORAGE_KEYS.COMPANY_ID)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.ACTIVE_APP)).toBeNull();
  });

  it('setSkipRestore and shouldSkipRestore work together', () => {
    setSkipRestore();
    expect(shouldSkipRestore()).toBe(true);
  });

  it('shouldSkipRestore returns false when not set', () => {
    expect(shouldSkipRestore()).toBe(false);
  });

  it('clearSkipRestore removes the flag', () => {
    setSkipRestore();
    clearSkipRestore();
    expect(shouldSkipRestore()).toBe(false);
  });

  it('setMicrosoftSession stores token and expiry', () => {
    setMicrosoftSession('token123', 3600);
    expect(getMicrosoftAccessToken()).toBe('token123');
  });

  it('getMicrosoftAccessToken returns null for expired token', () => {
    sessionStorage.setItem(STORAGE_KEYS.MICROSOFT_ACCESS_TOKEN, 'old');
    sessionStorage.setItem(STORAGE_KEYS.MICROSOFT_TOKEN_EXPIRES_AT, '0');
    expect(getMicrosoftAccessToken()).toBeNull();
  });

  it('getMicrosoftAccessToken returns null when not set', () => {
    expect(getMicrosoftAccessToken()).toBeNull();
  });

  it('clearMicrosoftSession removes token', () => {
    setMicrosoftSession('t', 100);
    clearMicrosoftSession();
    expect(getMicrosoftAccessToken()).toBeNull();
  });

  it('setMicrosoftAvatar and getMicrosoftAvatar work', () => {
    setMicrosoftAvatar('https://example.com/pic.jpg');
    expect(getMicrosoftAvatar()).toBe('https://example.com/pic.jpg');
  });

  it('clearMicrosoftAvatar removes avatar', () => {
    setMicrosoftAvatar('url');
    clearMicrosoftAvatar();
    expect(getMicrosoftAvatar()).toBeNull();
  });
});

