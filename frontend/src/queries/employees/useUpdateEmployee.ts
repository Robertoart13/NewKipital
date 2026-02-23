import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notification } from 'antd';
import { updateEmployee } from '../../api/employees';
import type { UpdateEmployeePayload } from '../../api/employees';
import { employeeKeys } from './keys';

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEmployeePayload }) =>
      updateEmployee(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      notification.success({ message: 'Empleado actualizado' });
    },
    onError: (err: Error) => {
      notification.error({
        message: 'Error al actualizar',
        description: err.message,
      });
    },
  });
}
