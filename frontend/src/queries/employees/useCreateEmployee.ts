import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { createEmployee } from '../../api/employees';
import type { CreateEmployeePayload } from '../../api/employees';

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEmployeePayload) => createEmployee(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      notification.success({ title: 'Empleado creado exitosamente' });
    },
    onError: (err: Error) => {
      notification.error({
        title: 'Error al crear empleado',
        description: err.message,
      });
    },
  });
}
