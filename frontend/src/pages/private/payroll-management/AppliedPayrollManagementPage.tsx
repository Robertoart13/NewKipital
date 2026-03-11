import { Card } from 'antd';

import { useAppSelector } from '../../../store/hooks';
import { canAccessAppliedPayrollList } from '../../../store/selectors/permissions.selectors';
import styles from '../configuration/UsersManagementPage.module.css';

import { PayrollManagementPage } from './PayrollManagementPage';

export function AppliedPayrollManagementPage() {
  const canAccess = useAppSelector(canAccessAppliedPayrollList);

  if (!canAccess) {
    return (
      <div className={styles.pageWrapper}>
        <Card className={styles.mainCard}>
          <p>No tiene permisos para visualizar planillas aplicadas.</p>
        </Card>
      </div>
    );
  }

  return <PayrollManagementPage mode="applied" />;
}
