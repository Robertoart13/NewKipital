import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { liquidateEmployee } from '../../api/employees';
import { employeeKeys } from './keys';

export function useLiquidateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      fechaSalida,
      motivo,
    }: {
      id: number;
      fechaSalida: string;
      motivo?: string;
    }) => liquidateEmployee(id, fechaSalida, motivo),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      notification.warning({ message: 'Empleado liquidado' });
    },
    onError: (err: Error) => {
      notification.error({
        message: 'Error al liquidar',
        description: err.message,
      });
    },
  });
}
