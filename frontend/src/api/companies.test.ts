import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../interceptors/httpInterceptor', () => ({
  httpFetch: vi.fn(),
}));

vi.mock('../config/api', () => ({
  API_URL: 'http://api.test',
}));

import { httpFetch } from '../interceptors/httpInterceptor';
import {
  commitCompanyLogo,
  createCompany,
  fetchCompanies,
  fetchCompanyAuditTrail,
  fetchCompanyLogoBlobUrl,
  getCompanyLogoUrl,
  uploadCompanyLogoTemp,
} from './companies';

const mockHttpFetch = vi.mocked(httpFetch);

function okJson<T>(data: T) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue(data),
    blob: vi.fn(),
  } as any;
}

describe('companies api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCompanies should call active endpoint by default', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));

    await fetchCompanies();

    expect(mockHttpFetch).toHaveBeenCalledWith('/companies');
  });

  it('fetchCompanies should include inactiveOnly when requested', async () => {
    mockHttpFetch.mockResolvedValue(okJson([]));

    await fetchCompanies(true);

    expect(mockHttpFetch).toHaveBeenCalledWith('/companies?inactiveOnly=true');
  });

  it('createCompany should throw joined message when backend returns array errors', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: ['Cedula requerida', 'Email invalido'] }),
    } as any);

    await expect(
      createCompany({
        nombre: 'ACME',
        nombreLegal: 'ACME SA',
        cedula: '',
        prefijo: 'AC',
      }),
    ).rejects.toThrow('Cedula requerida, Email invalido');
  });

  it('uploadCompanyLogoTemp and commitCompanyLogo should return backend payloads', async () => {
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    mockHttpFetch
      .mockResolvedValueOnce(okJson({ tempFileName: 'tmp.png', tempPath: '/tmp/tmp.png', size: 12, mimeType: 'image/png' }))
      .mockResolvedValueOnce(okJson({ logoFileName: 'logo.png', logoPath: '/logos/logo.png', logoUrl: '/logos/logo.png' }));

    const temp = await uploadCompanyLogoTemp(file);
    const committed = await commitCompanyLogo(2, temp.tempFileName);

    expect(temp.tempFileName).toBe('tmp.png');
    expect(committed.logoFileName).toBe('logo.png');
    expect(mockHttpFetch).toHaveBeenNthCalledWith(2, '/companies/2/logo/commit', {
      method: 'POST',
      body: JSON.stringify({ tempFileName: 'tmp.png' }),
    });
  });

  it('fetchCompanyLogoBlobUrl should return object URL and fail on non-ok response', async () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    mockHttpFetch.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['x'], { type: 'image/png' })),
    } as any);

    await expect(fetchCompanyLogoBlobUrl(6)).resolves.toBe('blob:mock-url');
    expect(createObjectUrlSpy).toHaveBeenCalled();

    mockHttpFetch.mockResolvedValueOnce({ ok: false } as any);
    await expect(fetchCompanyLogoBlobUrl(6)).rejects.toThrow('Error al cargar logo de empresa');
    createObjectUrlSpy.mockRestore();
  });

  it('fetchCompanyAuditTrail should propagate backend message', async () => {
    mockHttpFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: 'Sin permiso de auditoria' }),
    } as any);

    await expect(fetchCompanyAuditTrail(8)).rejects.toThrow('Sin permiso de auditoria');
  });

  it('getCompanyLogoUrl should build deterministic URL', () => {
    expect(getCompanyLogoUrl(7)).toBe('http://api.test/companies/7/logo');
    expect(getCompanyLogoUrl(7, true)).toContain('http://api.test/companies/7/logo?t=');
  });
});
