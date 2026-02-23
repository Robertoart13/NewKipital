import { useState } from 'react';
import { Avatar, Space, Tooltip, Button, Dropdown } from 'antd';
import { SwapOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { NotificationBell } from './NotificationBell';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { setActiveApp } from '../../../store/slices/activeAppSlice';
import { performLogout } from '../../../lib/auth';
import { STORAGE_KEYS, getMicrosoftAccessToken } from '../../../lib/storage';
import type { PlatformApp } from '../../../store/slices/authSlice';
import styles from './ProfileDropdown.module.css';

interface HeaderActionsProps {
  userName?: string;
}

const APP_LABELS: Record<PlatformApp, string> = {
  kpital: 'KPITAL 360',
  timewise: 'TimeWise',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN_SISTEMA: 'Administrador de TI',
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  USER: 'Usuario',
};

function formatRoleLabel(roles: string[]): string {
  const first = roles[0];
  return first ? (ROLE_LABELS[first] ?? first) : 'Usuario';
}

export function HeaderActions({
  userName = 'Usuario',
}: HeaderActionsProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const activeApp = useAppSelector((s) => s.activeApp.app);
  const enabledApps = useAppSelector((s) => s.auth.user?.enabledApps ?? []);
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);
  const avatarUrl = useAppSelector((s) => s.auth.user?.avatarUrl ?? null);
  const hasMicrosoftSession = Boolean(getMicrosoftAccessToken());

  const displayRole = formatRoleLabel(roles);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const otherApp = activeApp === 'kpital' ? 'timewise' : 'kpital';
  const canSwitch = enabledApps.includes(otherApp);

  const handleSwitchApp = () => {
    if (!canSwitch) return;
    dispatch(setActiveApp(otherApp));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_APP, otherApp);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await performLogout(dispatch);
    navigate('/auth/login');
  };

  const handleProfileClick = () => {
    setDropdownOpen(false);
  };

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const defaultMicrosoftAvatar = '/assets/images/authentication/microsoft.png';
  const resolvedAvatarSrc = avatarUrl ?? (hasMicrosoftSession ? defaultMicrosoftAvatar : undefined);

  const dropdownContent = (
    <div className={styles.dropdown}>
      <div className={styles.title}>Perfil Usuario</div>
      <div className={styles.userInfo}>
        <Avatar
          size={40}
          src={resolvedAvatarSrc}
          style={{ backgroundColor: '#d9d9d9', color: '#595959', flexShrink: 0 }}
        >
          {initials}
        </Avatar>
        <div className={styles.userText}>
          <div className={styles.userName}>{userName}</div>
          <div className={styles.userRole}>{displayRole}</div>
        </div>
      </div>
      <div className={styles.separator} role="separator" />
      <div className={styles.menu}>
        <Link to="/profile" className={styles.menuItem} onClick={handleProfileClick}>
          <UserOutlined />
          <span>Mi Perfil</span>
        </Link>
        <div className={styles.separator} role="separator" />
        <button type="button" className={styles.menuItem} onClick={handleLogout}>
          <LogoutOutlined />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <Space size="middle" align="center">
      {canSwitch && (
        <Tooltip title={`Ir a ${APP_LABELS[otherApp]}`}>
          <Button
            type="text"
            icon={<SwapOutlined />}
            onClick={handleSwitchApp}
            style={{
              fontSize: 13,
              color: '#595959',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Ir a {APP_LABELS[otherApp]}
          </Button>
        </Tooltip>
      )}
      <NotificationBell />
      <Dropdown
        open={dropdownOpen}
        onOpenChange={setDropdownOpen}
        trigger={['click']}
        popupRender={() => dropdownContent}
        placement="bottomRight"
      >
        <button
          type="button"
          className={styles.avatarTrigger}
          aria-label="Abrir perfil de usuario"
        >
          <Avatar
            size="default"
            src={resolvedAvatarSrc}
            style={{ backgroundColor: '#d9d9d9', color: '#595959', fontSize: 12, cursor: 'pointer' }}
          >
            {initials}
          </Avatar>
        </button>
      </Dropdown>
    </Space>
  );
}

