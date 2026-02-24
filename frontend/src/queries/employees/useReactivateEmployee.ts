import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { reactivateEmployee } from '../../api/employees';
import { employeeKeys } from './keys';

export function useReactivateEmployee() {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();

  return useMutation({
    mutationFn: ({ id }: { id: number }) => reactivateEmployee(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      notification.success({ message: 'Empleado reactivado' });
    },
    onError: (err: Error) => {
      notification.error({
        message: 'Error al reactivar',
        description: err.message,
      });
    },
  });
}
