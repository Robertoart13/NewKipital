import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../store/hooks', () => ({
  useAppSelector: vi.fn(),
  useAppDispatch: vi.fn(() => vi.fn()),
}));

vi.mock('antd', () => ({
  Result: ({ title, subTitle }: { title?: string; subTitle?: string }) => (
    <div data-testid="result-403">
      <span>{title}</span>
      <span>{subTitle}</span>
    </div>
  ),
}));

vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid={`navigate-${to.replace(/\//g, '-').replace(/^-/, '')}`} />,
  useLocation: () => ({ pathname: '/test' }),
}));

import { useAppSelector } from '../../store/hooks';

import { PermissionGuard } from '../PermissionGuard';

const mockSelector = useAppSelector as ReturnType<typeof vi.fn>;

function setup(isAuthenticated: boolean, loaded: boolean, permissions: string[]) {
  mockSelector.mockImplementation((selector: (s: object) => unknown) => {
    const fakeState = {
      auth: { isAuthenticated },
      permissions: { loaded, permissions },
    };
    return selector(fakeState as never);
  });
}

function renderGuard(permission: string, children = <div>Contenido protegido</div>) {
  return render(<PermissionGuard requiredPermission={permission}>{children}</PermissionGuard>);
}

describe('PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /auth/login when not authenticated', () => {
    setup(false, false, []);
    renderGuard('employee:view');
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByTestId('navigate-auth-login')).toBeInTheDocument();
  });

  it('renders null while permissions are loading (authenticated, not loaded)', () => {
    setup(true, false, []);
    const { container } = renderGuard('employee:view');
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('shows 403 when authenticated, loaded, but missing permission', () => {
    setup(true, true, ['payroll:view']);
    renderGuard('employee:view');
    expect(screen.queryByText('Contenido protegido')).not.toBeInTheDocument();
    expect(screen.getByTestId('result-403')).toBeInTheDocument();
    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
  });

  it('renders children when user has the required permission', () => {
    setup(true, true, ['employee:view', 'employee:create']);
    renderGuard('employee:view');
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('renders children when permission differs only by underscore/hyphen', () => {
    setup(true, true, ['employee:view_sensitive']);
    renderGuard('employee:view-sensitive');
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('includes the missing permission name in the 403 subtitle', () => {
    setup(true, true, []);
    renderGuard('payroll:create');
    expect(screen.getByText(/payroll:create/)).toBeInTheDocument();
  });

  it('grants access via company:manage alias for company-scoped permissions', () => {
    setup(true, true, ['company:manage']);
    renderGuard('company:edit');
    expect(screen.getByText('Contenido protegido')).toBeInTheDocument();
  });

  it('renders multiple children when permission is granted', () => {
    setup(true, true, ['employee:view']);
    render(
      <PermissionGuard requiredPermission="employee:view">
        <span>Item A</span>
        <span>Item B</span>
      </PermissionGuard>,
    );
    expect(screen.getByText('Item A')).toBeInTheDocument();
    expect(screen.getByText('Item B')).toBeInTheDocument();
  });
});
