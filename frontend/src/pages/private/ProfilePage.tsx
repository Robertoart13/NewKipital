import { Card, Typography } from 'antd';
import { useAppSelector } from '../../store/hooks';

/**
 * Página de perfil del usuario autenticado.
 */
export function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <div>
      <Typography.Title level={3}>Mi Perfil</Typography.Title>
      <Card>
        {user && (
          <div>
            <p><strong>Nombre:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Roles:</strong> {user.roles.join(', ')}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
