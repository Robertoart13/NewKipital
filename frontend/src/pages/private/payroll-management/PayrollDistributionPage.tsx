import { Card } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { fetchPayrollByPublicId, type PayrollListItem } from '../../../api/payroll';
import { useAppSelector } from '../../../store/hooks';
import { canAccessAppliedPayrollList } from '../../../store/selectors/permissions.selectors';
import styles from '../configuration/UsersManagementPage.module.css';

export function PayrollDistributionPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const canAccess = useAppSelector(canAccessAppliedPayrollList);
  const [error, setError] = useState<string | null>(null);
  const [payroll, setPayroll] = useState<PayrollListItem | null>(null);

  useEffect(() => {
    if (!canAccess || !publicId) return;

    void fetchPayrollByPublicId(publicId)
      .then((row) => setPayroll(row))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'No se pudo cargar la planilla'),
      );
  }, [canAccess, publicId]);

  if (!canAccess) {
    return (
      <div className={styles.pageWrapper}>
        <Card className={styles.mainCard}>
          <p>No tiene permisos para visualizar la distribucion de planilla.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <Card className={styles.mainCard}>
        <h1 className={styles.pageTitle}>Distribucion de la planilla</h1>
        <p className={styles.pageSubtitle}>
          Planilla:{' '}
          {payroll?.nombrePlanilla?.trim() || (payroll?.id ? `#${payroll.id}` : '--')}
        </p>
        {error ? <p>{error}</p> : null}
      </Card>
    </div>
  );
}
