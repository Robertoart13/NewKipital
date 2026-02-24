import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { inactivateEmployee } from '../../api/employees';
import { employeeKeys } from './keys';

export function useInactivateEmployee() {
  const queryClient = useQueryClient();
  const { notification } = App.useApp();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo?: string }) =>
      inactivateEmployee(id, motivo),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(id) });
      notification.warning({ message: 'Empleado inactivado' });
    },
    onError: (err: Error & { response?: { code?: string; planillas?: { id: number }[]; acciones?: { id: number; tipoAccion?: string }[] } }) => {
      const desc =
        err.response?.planillas?.length
          ? `Planillas activas: ${err.response.planillas.map((p) => `#${p.id}`).join(', ')}. Cierrelas o aplíquelas primero.`
          : err.response?.acciones?.length
            ? `Acciones pendientes: ${err.response.acciones.map((a) => `#${a.id} (${a.tipoAccion ?? 'N/A'})`).join(', ')}. Complételas o cancélelas primero.`
            : err.message;
      notification.error({
        message: err.response?.code === 'PLANILLAS_ACTIVAS' ? 'Planillas activas' : err.response?.code === 'ACCIONES_PENDIENTES' ? 'Acciones de personal pendientes' : 'Error al inactivar',
        description: desc,
        duration: 8,
      });
    },
  });
}
