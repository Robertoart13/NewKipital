/**
 * Helper para usar supertest en e2e con Jest (CI y local).
 * Evita "request is not a function" cuando el default export no se resuelve igual.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require('supertest');
export const request = (typeof supertest === 'function' ? supertest : supertest.default) as typeof import('supertest');
