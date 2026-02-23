import { Tag } from 'antd';

interface EmployeeStatusBadgeProps {
  estado: number;
}

/**
 * Badge visual de estado: 1=Activo (verde), 0=Inactivo/Liquidado (rojo).
 */
export function EmployeeStatusBadge({ estado }: EmployeeStatusBadgeProps) {
  if (estado === 1) {
    return <Tag color="green">Activo</Tag>;
  }
  return <Tag color="red">Inactivo</Tag>;
}
