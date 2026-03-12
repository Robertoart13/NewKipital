import { Card } from 'antd';

import styles from '../configuration/UsersManagementPage.module.css';

export function PayrollOvertimeBulkUploadPage() {
  return (
    <div className={styles.pageWrapper}>
      <Card className={styles.mainCard}>
        <h1 className={styles.pageTitle}>Vista de carga masiva de horas extras</h1>
      </Card>
    </div>
  );
}
