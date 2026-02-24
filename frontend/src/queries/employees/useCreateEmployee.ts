import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { createEmployee } from '../../api/employees';
import type { CreateEmployeePayload } from '../../api/employees';

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();

  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      notification.success({ message: 'Empleado creado exitosamente' });
    },
    onError: (err: Error) => {
      notification.error({
        message: 'Error al crear empleado',
        description: err.message,
      });
    },
  });
}
