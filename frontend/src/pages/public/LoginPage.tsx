import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Divider } from 'antd';
import {
  ExclamationCircleFilled,
  CloseOutlined,
  MailOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/slices/authSlice';
import type { PlatformApp, User, UserCompanyInfo } from '../../store/slices/authSlice';
import { setActiveApp } from '../../store/slices/activeAppSlice';
import { setActiveCompany } from '../../store/slices/activeCompanySlice';
import { setPermissions } from '../../store/slices/permissionsSlice';
import {
  STORAGE_KEYS,
  getStoredActiveApp,
  clearMicrosoftSession,
  clearMicrosoftAvatar,
  setMicrosoftSession,
  setMicrosoftAvatar,
  getMicrosoftAvatar,
} from '../../lib/storage';
import { httpFetch } from '../../interceptors/httpInterceptor';
import { fetchPermissionsForApp } from '../../api/permissions';

const { Title, Link } = Typography;

interface LoginForm {
  email: string;
  password: string;
}

interface MicrosoftPopupPayload {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

interface MicrosoftPopupBridgeMessage {
  type: string;
  payload: MicrosoftPopupPayload;
  timestamp: number;
}

interface MicrosoftTokenExchangeResponse {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface ApiErrorPayload {
  message?: string | string[];
}

const inputStyle: React.CSSProperties = {
  borderRadius: 24,
  height: 48,
  paddingLeft: 20,
  fontSize: 14,
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 16px',
  borderRadius: 10,
  background: '#fff1f0',
  border: '1px solid #ffccc7',
  marginBottom: 20,
  fontSize: 13,
  color: '#cf1322',
  fontWeight: 500,
};

const MICROSOFT_OAUTH_STATE_KEY = 'microsoft_oauth_state';
const MICROSOFT_OAUTH_CODE_VERIFIER_KEY = 'microsoft_oauth_code_verifier';
const MICROSOFT_POPUP_EVENT = 'MSAL_LOGIN_SUCCESS';
const MICROSOFT_POPUP_ERROR_EVENT = 'MSAL_LOGIN_ERROR';
const MICROSOFT_POPUP_BRIDGE_KEY = 'microsoft_popup_bridge_message';

function parseMicrosoftCallbackParams(): URLSearchParams {
  if (window.location.search) {
    return new URLSearchParams(window.location.search);
  }
  const hash = window.location.hash;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
}

function decodeJwtPayload(token: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('id_token invalido');
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json);
}

async function fetchMicrosoftProfilePhoto(accessToken?: string): Promise<string | null> {
  if (!accessToken) return null;

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return null;

    const blob = await response.blob();
    if (!blob || blob.size === 0) return null;

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const microsoftAuthTimeoutRef = useRef<number | null>(null);

  const clearMicrosoftPopupBridge = () => {
    localStorage.removeItem(MICROSOFT_POPUP_BRIDGE_KEY);
  };

  const publishMicrosoftPopupBridgeMessage = (message: MicrosoftPopupBridgeMessage) => {
    localStorage.setItem(MICROSOFT_POPUP_BRIDGE_KEY, JSON.stringify(message));
  };

  const clearMicrosoftOauthFlowState = () => {
    sessionStorage.removeItem(MICROSOFT_OAUTH_STATE_KEY);
    sessionStorage.removeItem(MICROSOFT_OAUTH_CODE_VERIFIER_KEY);
  };

  const mapMicrosoftErrorMessage = (payload: MicrosoftPopupPayload): string => {
    const errorCode = payload.error?.toLowerCase();
    const description = payload.errorDescription ?? '';

    if (errorCode === 'access_denied') {
      return 'Inicio de sesion con Microsoft cancelado por el usuario.';
    }

    if (description.toLowerCase().includes('unsupported_response_type')) {
      return 'Configuracion Microsoft invalida: la app no permite response_type=code. Revise Azure App Registration.';
    }

    return payload.errorDescription || 'Microsoft rechazo el inicio de sesion.';
  };

  const from = (location.state as { from?: string })?.from ?? '/dashboard';

  const microsoftClientId = (import.meta.env.VITE_MSAL_CLIENT_ID as string | undefined)
    ?? (import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined);
  const microsoftAuthority = (import.meta.env.VITE_MSAL_AUTHORITY as string | undefined)
    ?? ((import.meta.env.VITE_MICROSOFT_TENANT_ID as string | undefined)
      ? `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID as string}`
      : undefined);
  const microsoftScopes = (import.meta.env.VITE_MICROSOFT_SCOPES as string | undefined)
    ?? 'openid profile email User.Read';
  const microsoftRedirectUri = (import.meta.env.VITE_MSAL_REDIRECT_URI_PRODUCCION as string | undefined)
    ?? `${window.location.origin}/auth/login`;

  const base64UrlEncode = (bytes: Uint8Array): string => {
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const generateRandomString = (length: number): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const random = new Uint8Array(length);
    crypto.getRandomValues(random);
    return Array.from(random).map((v) => charset[v % charset.length]).join('');
  };

  const createCodeChallenge = async (verifier: string): Promise<string> => {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(digest));
  };

  const finalizeSession = async (user: User, companies: UserCompanyInfo[]) => {
    const mergedUser: User = {
      ...user,
      avatarUrl: user.avatarUrl ?? getMicrosoftAvatar() ?? null,
    };

    dispatch(setCredentials({ user: mergedUser, companies }));

    const storedApp = getStoredActiveApp();
    if (storedApp === 'kpital' || storedApp === 'timewise') {
      dispatch(setActiveApp(storedApp));
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_APP, 'kpital');
    }

    localStorage.removeItem(STORAGE_KEYS.COMPANY_ID);
    dispatch(setActiveCompany(null));

    try {
      const appCode = storedApp === 'kpital' || storedApp === 'timewise' ? storedApp : 'kpital';
      const { permissions, roles } = await fetchPermissionsForApp(appCode);
      dispatch(setPermissions({ permissions, roles, appId: appCode }));
    } catch {
      const appCode = storedApp === 'kpital' || storedApp === 'timewise' ? storedApp : 'kpital';
      dispatch(setPermissions({ permissions: [], roles: [], appId: appCode }));
    }

    navigate(from, { replace: true });
  };

  const completeMicrosoftLogin = async (payload: MicrosoftPopupPayload) => {
    if (microsoftAuthTimeoutRef.current !== null) {
      window.clearTimeout(microsoftAuthTimeoutRef.current);
      microsoftAuthTimeoutRef.current = null;
    }

    if (payload.error) {
      setMicrosoftLoading(false);
      clearMicrosoftOauthFlowState();
      clearMicrosoftSession();
      clearMicrosoftAvatar();
      setError(mapMicrosoftErrorMessage(payload));
      return;
    }

    if (!payload.code) {
      setMicrosoftLoading(false);
      clearMicrosoftOauthFlowState();
      clearMicrosoftSession();
      clearMicrosoftAvatar();
      setError('Microsoft no devolvio code.');
      return;
    }

    const expectedState = sessionStorage.getItem(MICROSOFT_OAUTH_STATE_KEY);
    const codeVerifier = sessionStorage.getItem(MICROSOFT_OAUTH_CODE_VERIFIER_KEY);
    if (!payload.state || !expectedState || payload.state !== expectedState || !codeVerifier) {
      setMicrosoftLoading(false);
      clearMicrosoftOauthFlowState();
      clearMicrosoftSession();
      clearMicrosoftAvatar();
      setError('No se pudo validar el estado del login Microsoft.');
      return;
    }

    try {
      const authority = microsoftAuthority?.replace(/\/+$/, '');
      if (!authority || !microsoftClientId) {
        throw new Error('Configuracion Microsoft incompleta en frontend.');
      }

      const tokenEndpoint = `${authority}/oauth2/v2.0/token`;
      const tokenBody = new URLSearchParams({
        client_id: microsoftClientId,
        grant_type: 'authorization_code',
        code: payload.code,
        redirect_uri: microsoftRedirectUri,
        code_verifier: codeVerifier,
      });

      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      });

      const tokenPayload = await tokenResponse.json() as MicrosoftTokenExchangeResponse;
      if (!tokenResponse.ok || !tokenPayload.id_token) {
        throw new Error(tokenPayload.error_description || tokenPayload.error || 'No se pudo validar el login de Microsoft');
      }

      if (tokenPayload.access_token) {
        setMicrosoftSession(tokenPayload.access_token, tokenPayload.expires_in ?? 3600);
      }

      const claims = decodeJwtPayload(tokenPayload.id_token);
      const email = (claims.preferred_username || claims.upn || claims.email || '').toLowerCase();
      const name = claims.name || email;
      const id = claims.oid || claims.sub;
      const tenantId = claims.tid;

      if (!email || !id || !tenantId) {
        throw new Error('Token Microsoft incompleto.');
      }

      const response = await httpFetch('/auth/validate', {
        method: 'POST',
        body: JSON.stringify({
          email,
          name,
          id,
          tenantId,
          accessToken: tokenPayload.access_token ?? '',
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as ApiErrorPayload | null;
        const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
        throw new Error(message || 'No se pudo validar usuario Microsoft en backend.');
      }

      const body = await response.json();
      const microsoftPhoto = await fetchMicrosoftProfilePhoto(tokenPayload.access_token);
      if (microsoftPhoto) {
        setMicrosoftAvatar(microsoftPhoto);
      }

      const normalizedUser: User | null = body?.data?.usuario
        ? {
            id: String(body.data.usuario.id),
            email: body.data.usuario.email,
            name: body.data.usuario.name,
            avatarUrl: body.data.usuario.avatarUrl ?? microsoftPhoto ?? null,
            roles: body.data.usuario.roles ?? [],
            enabledApps: (body.data.usuario.enabledApps ?? []).filter(
              (app: string): app is PlatformApp => app === 'kpital' || app === 'timewise',
            ),
            companyIds: body.data.usuario.companyIds ?? [],
          }
        : body?.user ?? null;

      const normalizedCompanies: UserCompanyInfo[] = (body?.data?.usuario?.companies ?? body?.companies ?? []).map(
        (company: { id: number; nombre: string; codigo?: string | null }) => ({
          id: company.id,
          nombre: company.nombre,
          codigo: company.codigo ?? null,
        }),
      );

      if (!normalizedUser || !Array.isArray(normalizedCompanies)) {
        throw new Error('Respuesta de autenticacion Microsoft invalida.');
      }

      clearMicrosoftOauthFlowState();
      await finalizeSession(normalizedUser, normalizedCompanies);
    } catch (err) {
      clearMicrosoftOauthFlowState();
      clearMicrosoftSession();
      clearMicrosoftAvatar();
      setError((err as Error).message || 'No se pudo completar login Microsoft.');
    } finally {
      setMicrosoftLoading(false);
    }
  };

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: values.email, password: values.password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || 'Credenciales invalidas');
      }

      const { user, companies } = await response.json();
      clearMicrosoftSession();
      clearMicrosoftAvatar();
      await finalizeSession(user, companies);
    } catch (err) {
      setError((err as Error).message || 'Credenciales invalidas. Verifique su correo y contrasena.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    if (!microsoftClientId || !microsoftAuthority) {
      setError('Login Microsoft no configurado. Falta VITE_MSAL_CLIENT_ID o VITE_MSAL_AUTHORITY.');
      return;
    }

    setMicrosoftLoading(true);
    setError(null);
    clearMicrosoftPopupBridge();

    const state = crypto.randomUUID();
    const codeVerifier = generateRandomString(96);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    sessionStorage.setItem(MICROSOFT_OAUTH_STATE_KEY, state);
    sessionStorage.setItem(MICROSOFT_OAUTH_CODE_VERIFIER_KEY, codeVerifier);

    const authority = microsoftAuthority.replace(/\/+$/, '');
    const authUrl = new URL(`${authority}/oauth2/v2.0/authorize`);
    authUrl.searchParams.set('client_id', microsoftClientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', microsoftRedirectUri);
    authUrl.searchParams.set('response_mode', 'query');
    authUrl.searchParams.set('scope', microsoftScopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'select_account');

    const popup = window.open(
      authUrl.toString(),
      'microsoft-login',
      'popup=yes,width=560,height=720,left=200,top=80',
    );

    if (!popup) {
      setMicrosoftLoading(false);
      setError('El navegador bloqueo el popup de Microsoft.');
      return;
    }

    if (microsoftAuthTimeoutRef.current !== null) {
      window.clearTimeout(microsoftAuthTimeoutRef.current);
    }

    microsoftAuthTimeoutRef.current = window.setTimeout(() => {
      setMicrosoftLoading(false);
      clearMicrosoftOauthFlowState();
      clearMicrosoftSession();
      clearMicrosoftAvatar();
      setError('No se recibio respuesta del popup de Microsoft. El usuario cancelo o el flujo no finalizo.');
    }, 120000);
  };

  useEffect(() => {
    const params = parseMicrosoftCallbackParams();
    if (!params.get('code') && !params.get('error')) return;

    const message: MicrosoftPopupPayload = {
      code: params.get('code') ?? undefined,
      state: params.get('state') ?? undefined,
      error: params.get('error') ?? undefined,
      errorDescription: params.get('error_description') ?? undefined,
    };

    const type = message.error ? MICROSOFT_POPUP_ERROR_EVENT : MICROSOFT_POPUP_EVENT;
    const isMicrosoftPopupWindow = window.name === 'microsoft-login';

    if (window.opener) {
      window.opener.postMessage({ type, payload: message }, window.location.origin);
      window.close();
      return;
    }

    if (isMicrosoftPopupWindow) {
      publishMicrosoftPopupBridgeMessage({
        type,
        payload: message,
        timestamp: Date.now(),
      });
      window.close();
      return;
    }

    window.history.replaceState({}, document.title, '/auth/login');
    void completeMicrosoftLogin(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === MICROSOFT_POPUP_EVENT || event.data.type === MICROSOFT_POPUP_ERROR_EVENT) {
        completeMicrosoftLogin(event.data.payload as MicrosoftPopupPayload);
      }
    };

    const storageListener = (event: StorageEvent) => {
      if (event.key !== MICROSOFT_POPUP_BRIDGE_KEY) return;
      if (!event.newValue) return;

      try {
        const bridgeMessage = JSON.parse(event.newValue) as MicrosoftPopupBridgeMessage;
        if (
          bridgeMessage.type === MICROSOFT_POPUP_EVENT
          || bridgeMessage.type === MICROSOFT_POPUP_ERROR_EVENT
        ) {
          void completeMicrosoftLogin(bridgeMessage.payload);
          clearMicrosoftPopupBridge();
        }
      } catch {
        // noop
      }
    };

    window.addEventListener('message', listener);
    window.addEventListener('storage', storageListener);
    return () => {
      window.removeEventListener('message', listener);
      window.removeEventListener('storage', storageListener);
      if (microsoftAuthTimeoutRef.current !== null) {
        window.clearTimeout(microsoftAuthTimeoutRef.current);
        microsoftAuthTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card
      style={{
        width: 460,
        minHeight: 520,
        padding: '16px 8px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        borderRadius: 16,
        border: '1px solid #e8ecf0',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 32, minHeight: 100 }}>
        <img
          src="/assets/images/global/LogoLarge.png"
          alt="KPITAL 360"
          style={{ height: 72, marginBottom: 16, display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
        />
        <Title level={4} style={{ margin: 0, fontWeight: 600, color: '#262626' }}>
          Inicie sesion con su correo Corporativo
        </Title>
      </div>

      {error && (
        <div style={errorBannerStyle}>
          <ExclamationCircleFilled style={{ fontSize: 18, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <CloseOutlined
            style={{ fontSize: 12, cursor: 'pointer', opacity: 0.6 }}
            onClick={() => setError(null)}
          />
        </div>
      )}

      <Form<LoginForm>
        className="login-form"
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        size="large"
      >
        <Form.Item
          name="email"
          label=""
          rules={[
            { required: true, message: 'Ingrese su correo electrónico' },
            { type: 'email', message: 'El formato del correo no es válido' },
          ]}
          style={{ marginBottom: 20 }}
        >
          <Input
            prefix={<MailOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />}
            placeholder="Correo electrónico"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label=""
          rules={[
            { required: true, message: 'Ingrese su contraseña' },
            { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' },
          ]}
          style={{ marginBottom: 20 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: '#8c8c8c', fontSize: 16 }} />}
            placeholder="Contraseña"
            style={inputStyle}
          />
        </Form.Item>

        <div style={{ marginBottom: 20 }}>
          <Link style={{ color: '#20638d', fontSize: 13 }}>
            ¿Has olvidado tu contraseña?
          </Link>
        </div>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{
              height: 48,
              borderRadius: 24,
              fontWeight: 600,
              fontSize: 15,
              background: '#20638d',
            }}
          >
            Iniciar sesión
          </Button>
        </Form.Item>
      </Form>

      <Divider style={{ margin: '24px 0 16px', color: '#8c8c8c', fontSize: 13 }}>
        O continuar con
      </Divider>

      <Button
        block
        onClick={handleMicrosoftLogin}
        disabled={microsoftLoading}
        style={{
          height: 48,
          borderRadius: 24,
          fontWeight: 600,
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <img
          src="/assets/images/authentication/microsoft.png"
          alt="Microsoft"
          style={{ height: 22, width: 22, objectFit: 'contain', flexShrink: 0 }}
        />
        <span>{microsoftLoading ? 'Validando con Microsoft...' : 'Microsoft'}</span>
      </Button>
    </Card>
  );
}
