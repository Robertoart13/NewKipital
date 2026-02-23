import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { inactivateEmployee } from '../../api/employees';
import { employeeKeys } from './keys';

export function useInactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      inactivateEmployee(id, motivo),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      notification.warning({ message: 'Empleado inactivado' });
    },
    onError: (err: Error) => {
      notification.error({
        message: 'Error al inactivar',
        description: err.message,
      });
    },
  });
}
