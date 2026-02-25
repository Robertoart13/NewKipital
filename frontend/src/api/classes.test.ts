import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import { createClass, fetchClasses, updateClass } from './classes';

const mockHttpFetch = vi.mocked(httpFetch);

function okJson<T>(data: T) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
  } as any;
}

describe('classes api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchClasses should call active endpoint by default', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchClasses();
    expect(mockHttpFetch).toHaveBeenCalledWith('/classes');
  });

  it('fetchClasses should include inactiveOnly when requested', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));
    await fetchClasses(true);
    expect(mockHttpFetch).toHaveBeenCalledWith('/classes?inactiveOnly=true');
  });

  it('createClass should throw joined message when backend returns array errors', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: ['Codigo repetido', 'Nombre requerido'] }),
    } as any);

    await expect(
      createClass({
        nombre: '',
        codigo: 'X',
      }),
    ).rejects.toThrow('Codigo repetido, Nombre requerido');
  });

  it('updateClass should call endpoint with put payload', async () => {
    mockHttpFetch.mockResolvedValue(okJson({ id: 2, nombre: 'Clase', codigo: 'CL-01', esInactivo: 0 }));
    await updateClass(2, { nombre: 'Clase' });
    expect(mockHttpFetch).toHaveBeenCalledWith('/classes/2', {
      method: 'PUT',
      body: JSON.stringify({ nombre: 'Clase' }),
    });
  });
});

