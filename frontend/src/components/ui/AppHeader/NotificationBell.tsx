import { useState, useCallback, useMemo } from 'react';
import { App as AntdApp, Badge, Dropdown, Space, Button, Typography, Empty } from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  SafetyOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '../../../store/hooks';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAsDeleted,
  useMarkAllAsRead,
} from '../../../queries/notifications/useNotifications';
import { useNotificationSocket } from '../../../hooks/useNotificationSocket';
import type { NotificationItem } from '../../../api/notifications';

const { Text } = Typography;

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getSectionLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const notifDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - notifDate.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return 'Esta semana';
  return 'Anterior';
}

function getIconForTipo(tipo: string): React.ReactNode {
  const t = (tipo || '').toLowerCase();
  if (t.includes('permiso') || t.includes('rol')) return <SafetyOutlined style={{ color: '#374151', fontSize: 18 }} />;
  if (t.includes('mensaje') || t.includes('message')) return <MessageOutlined style={{ color: '#6b7280', fontSize: 18 }} />;
  return <BellOutlined style={{ color: '#6b7280', fontSize: 18 }} />;
}

export function NotificationBell() {
  const { message } = AntdApp.useApp();
  const [open, setOpen] = useState(false);
  const activeApp = useAppSelector((s) => s.activeApp.app);
  const activeCompany = useAppSelector((s) => s.activeCompany.company);
  const companyIdNum = activeCompany?.id != null ? parseInt(String(activeCompany.id), 10) : undefined;
  const appCode = activeApp === 'kpital' ? 'kpital' : activeApp === 'timewise' ? 'timewise' : undefined;

  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  useNotificationSocket(!!isAuthenticated);

  const { data: countData } = useUnreadCount({ appCode, companyId: companyIdNum });
  const count = typeof countData === 'number' ? countData : 0;
  const { data: listData, isLoading } = useNotifications({
    status: 'all',
    appCode,
    companyId: companyIdNum,
  });
  const list = Array.isArray(listData) ? listData : [];
  const markRead = useMarkAsRead();
  const markDeleted = useMarkAsDeleted();
  const markAllRead = useMarkAllAsRead();

  const groupedBySection = useMemo(() => {
    const groups: Record<string, NotificationItem[]> = {};
    const order = ['Hoy', 'Ayer', 'Esta semana', 'Anterior'];
    for (const item of list) {
      const section = getSectionLabel(item.fechaCreacion);
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    }
    return order.filter((s) => groups[s]?.length).map((s) => ({ label: s, items: groups[s] }));
  }, [list]);

  const handleMarkRead = useCallback(
    (item: NotificationItem) => {
      if (item.estado === 'UNREAD') {
        markRead.mutate(item.id, { onSuccess: () => message.success('Marcada como leída') });
      }
    },
    [markRead],
  );

  const handleDelete = useCallback(
    (item: NotificationItem, e: React.MouseEvent) => {
      e.stopPropagation();
      markDeleted.mutate(item.id, { onSuccess: () => message.success('Eliminada') });
    },
    [markDeleted],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(
      { appCode, companyId: companyIdNum },
      { onSuccess: () => message.success('Todas marcadas como leídas') },
    );
    setOpen(false);
  }, [markAllRead, appCode, companyIdNum]);

  const content = (
    <div
      style={{
        width: 420,
        maxHeight: 520,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fafafa',
        }}
      >
        <Text strong style={{ fontSize: 16 }}>Notificaciones</Text>
        {count > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead} loading={markAllRead.isPending} style={{ padding: 0 }}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {isLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Text type="secondary">Cargando...</Text>
          </div>
        ) : list.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay notificaciones"
            style={{ padding: 40 }}
          />
        ) : (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            {groupedBySection.map(({ label, items }) => (
              <div key={label}>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 10, textTransform: 'uppercase' }}>
                  {label}
                </Text>
                <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleMarkRead(item)}
                      style={{
                        display: 'flex',
                        gap: 12,
                        padding: 14,
                        borderRadius: 10,
                      background: item.estado === 'UNREAD' ? '#f9fafb' : '#fff',
                      border: `1px solid ${item.estado === 'UNREAD' ? '#e5e7eb' : '#e5e7eb'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: item.estado === 'UNREAD' ? '#f3f4f6' : '#f9fafb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getIconForTipo(item.tipo)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <Text strong={item.estado === 'UNREAD'} ellipsis style={{ fontSize: 14 }}>
                            {item.titulo}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {formatTime(item.fechaCreacion)}
                            </Text>
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined style={{ fontSize: 13, color: '#94a3b8' }} />}
                              onClick={(e) => handleDelete(item, e)}
                              loading={markDeleted.isPending}
                              style={{ width: 22, height: 22, padding: 0, marginLeft: 2 }}
                            />
                          </div>
                        </div>
                        {item.mensaje && (
                          <div
                            style={{
                              fontSize: 13,
                              color: '#64748b',
                              marginTop: 6,
                              lineHeight: 1.4,
                            }}
                          >
                            {item.mensaje}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </Space>
              </div>
            ))}
          </Space>
        )}
      </div>

      {/* Footer */}
      {list.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e5e7eb',
            background: '#fafafa',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button type="primary" size="middle" onClick={handleMarkAllRead} loading={markAllRead.isPending}>
            Marcar todas como leídas
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      popupRender={() => content}
      placement="bottomRight"
      styles={{ root: { padding: 0, background: 'transparent', boxShadow: 'none' } }}
    >
      <Badge count={count} size="small" offset={[-2, 2]} color="#374151">
        <BellOutlined style={{ fontSize: 18, color: '#6b7280', cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
}
