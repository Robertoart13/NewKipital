import { BellOutlined, CheckOutlined, DeleteOutlined, MessageOutlined, SafetyOutlined } from '@ant-design/icons';
import { App as AntdApp, Button, Card, Empty, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';


import {
  useMarkAllAsRead,
  useMarkAsDeleted,
  useMarkAsRead,
  useNotifications,
  useUnreadCount,
} from '../../../queries/notifications/useNotifications';
import { useAppSelector } from '../../../store/hooks';

import type { NotificationItem } from '../../../api/notifications';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('es-CR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeIcon(tipo: string) {
  const value = (tipo || '').toLowerCase();
  if (value.includes('permiso') || value.includes('rol')) return <SafetyOutlined />;
  if (value.includes('message') || value.includes('mensaje')) return <MessageOutlined />;
  return <BellOutlined />;
}

export function NotificationsCenterPage() {
  const { message } = AntdApp.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread'>('all');

  const activeApp = useAppSelector((s) => s.activeApp.app);
  const appCode = activeApp === 'kpital' ? 'kpital' : activeApp === 'timewise' ? 'timewise' : undefined;

  const { data: notificationsData, isLoading } = useNotifications({
    status: statusFilter,
    appCode,
  });
  const notifications = useMemo(
    () => (Array.isArray(notificationsData) ? notificationsData : []),
    [notificationsData],
  );

  const { data: unreadCountData } = useUnreadCount({ appCode });
  const unreadCount = typeof unreadCountData === 'number' ? unreadCountData : 0;

  const markRead = useMarkAsRead();
  const markDeleted = useMarkAsDeleted();
  const markAllRead = useMarkAllAsRead();

  const selectedId = Number.parseInt(searchParams.get('selected') || '', 10);
  const selectedNotification = notifications.find((item) => item.id === selectedId) ?? notifications[0] ?? null;

  const selectNotification = useCallback(
    (item: NotificationItem) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('selected', String(item.id));
        return next;
      });
      if (item.estado === 'UNREAD') {
        markRead.mutate(item.id, {
          onError: (error) => {
            message.error(error instanceof Error ? error.message : 'No se pudo marcar como leída');
          },
        });
      }
    },
    [markRead, message, setSearchParams],
  );

  const handleDelete = useCallback(
    (item: NotificationItem) => {
      markDeleted.mutate(item.id, {
        onSuccess: () => {
          message.success('Notificación eliminada');
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (String(item.id) === next.get('selected')) {
              next.delete('selected');
            }
            return next;
          });
        },
        onError: (error) => {
          message.error(error instanceof Error ? error.message : 'No se pudo eliminar la notificación');
        },
      });
    },
    [markDeleted, message, setSearchParams],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(
      { appCode },
      {
        onSuccess: () => message.success('Todas marcadas como leídas'),
        onError: (error) =>
          message.error(error instanceof Error ? error.message : 'No se pudieron marcar todas como leídas'),
      },
    );
  }, [appCode, markAllRead, message]);

  const columns: ColumnsType<NotificationItem> = useMemo(
    () => [
      {
        title: 'Estado',
        dataIndex: 'estado',
        key: 'estado',
        width: 110,
        render: (value: NotificationItem['estado']) => (
          <Tag color={value === 'UNREAD' ? 'blue' : 'default'}>{value === 'UNREAD' ? 'No leída' : 'Leída'}</Tag>
        ),
      },
      {
        title: 'Notificación',
        dataIndex: 'titulo',
        key: 'titulo',
        render: (_, row) => (
          <Space size={8}>
            <span style={{ color: '#5a6c7d' }}>{getTypeIcon(row.tipo)}</span>
            <div>
              <Text strong={row.estado === 'UNREAD'}>{row.titulo}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatDateTime(row.fechaCreacion)}
                </Text>
              </div>
            </div>
          </Space>
        ),
      },
      {
        title: 'Acciones',
        key: 'actions',
        width: 90,
        render: (_, row) => (
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          />
        ),
      },
    ],
    [handleDelete],
  );

  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        padding: 16,
        minHeight: '100%',
        background:
          'radial-gradient(circle at top left, rgba(59, 130, 246, 0.06), transparent 55%), #f5f7fb',
      }}
    >
      <Card
        bordered={false}
        bodyStyle={{ padding: 16, paddingBottom: 12 }}
        style={{
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Space
          direction="horizontal"
          size={16}
          align="center"
          style={{ justifyContent: 'space-between', width: '100%' }}
        >
          <Space direction="vertical" size={4}>
            <Title level={4} style={{ margin: 0 }}>
              Centro de notificaciones
            </Title>
            <Text type="secondary">
              Revise notificaciones no leídas y leídas. Seleccione una para ver el detalle completo.
            </Text>
          </Space>
          <Tag
            color="blue"
            style={{
              borderRadius: 999,
              paddingInline: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <BellOutlined /> {unreadCount} pendientes
          </Tag>
        </Space>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card
          title="Listado de notificaciones"
          extra={
            <Space>
              <Tag color="blue">No leídas: {unreadCount}</Tag>
              <Button
                icon={<CheckOutlined />}
                onClick={handleMarkAllRead}
                loading={markAllRead.isPending}
                disabled={unreadCount === 0}
              >
                Marcar todas
              </Button>
            </Space>
          }
        >
          <Space style={{ marginBottom: 12 }}>
            <Segmented
              options={[
                { label: 'Todas', value: 'all' },
                { label: 'No leídas', value: 'unread' },
              ]}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as 'all' | 'unread')}
            />
          </Space>
          <div
            style={{
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
            }}
          >
            <Table<NotificationItem>
              rowKey="id"
              columns={columns}
              dataSource={notifications}
              loading={isLoading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              onRow={(record) => ({
                onClick: () => selectNotification(record),
                style: {
                  cursor: 'pointer',
                  backgroundColor: record.id === selectedNotification?.id ? '#f0f7ff' : undefined,
                  transition: 'background-color 120ms ease-out',
                },
              })}
              locale={{ emptyText: <Empty description="No hay notificaciones" /> }}
              bordered
              size="middle"
            />
          </div>
        </Card>

        <Card
          title="Detalle de notificación"
          bodyStyle={{ padding: 20 }}
          style={{
            borderRadius: 16,
            boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
          }}
        >
          {!selectedNotification ? (
            <Empty description="Seleccione una notificación para ver el detalle" />
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Título</Text>
                <div>
                  <Text strong>{selectedNotification.titulo}</Text>
                </div>
              </div>
              <div>
                <Text type="secondary">Estado</Text>
                <div>
                  <Tag color={selectedNotification.estado === 'UNREAD' ? 'blue' : 'default'}>
                    {selectedNotification.estado === 'UNREAD' ? 'No leída' : 'Leída'}
                  </Tag>
                </div>
              </div>
              <div>
                <Text type="secondary">Fecha</Text>
                <div>
                  <Text>{formatDateTime(selectedNotification.fechaCreacion)}</Text>
                </div>
              </div>
              <div>
                <Text type="secondary">Mensaje completo</Text>
                <div
                  style={{
                    marginTop: 6,
                    borderRadius: 10,
                    padding: 14,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    background:
                      'linear-gradient(145deg, rgba(241, 245, 249, 0.9), rgba(239, 246, 255, 0.95))',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {selectedNotification.mensaje || 'Sin mensaje adicional.'}
                </div>
              </div>
            </Space>
          )}
        </Card>
      </div>
    </div>
  );
}

