import { Flex, Select, Switch, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FilterOutlined } from '@ant-design/icons';
import styles from '../../configuration/UsersManagementPage.module.css';
import type { PayrollArticleListItem } from '../../../../api/payrollArticles';
import type { ReactNode } from 'react';

interface PayrollArticlesTableProps {
  rows: PayrollArticleListItem[];
  columns: ColumnsType<PayrollArticleListItem>;
  loading: boolean;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  showInactive: boolean;
  onShowInactiveChange: (value: boolean) => void;
  selectedCompanyIds: number[];
  onCompanyIdsChange: (value: number[]) => void;
  companies: Array<{ id: number; nombre: string }>;
  canEdit: boolean;
  onRowClick: (row: PayrollArticleListItem) => void;
  totalLabel: (total: number, range: [number, number]) => string;
  filters: ReactNode;
}

/**
 * @param props - Propiedades de la tabla de articulos.
 * @returns Tabla principal con selector multi-empresa.
 */
export function PayrollArticlesTable(props: PayrollArticlesTableProps) {
  const {
    rows,
    columns,
    loading,
    pageSize,
    onPageSizeChange,
    showInactive,
    onShowInactiveChange,
    selectedCompanyIds,
    onCompanyIdsChange,
    companies,
    canEdit,
    onRowClick,
    totalLabel,
    filters,
  } = props;

  return (
    <div className={styles.mainCardBody}>
      <Flex align="center" justify="space-between" wrap="wrap" gap={12} className={styles.registrosHeader}>
        <Flex align="center" gap={12} wrap="wrap">
          <Flex align="center" gap={8}>
            <FilterOutlined className={styles.registrosFilterIcon} />
            <h3 className={styles.registrosTitle}>Registros de Articulos de Nomina</h3>
          </Flex>
          <Flex align="center" gap={6}>
            <Select
              value={pageSize}
              onChange={onPageSizeChange}
              options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
              style={{ width: 70 }}
            />
            <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
          </Flex>
        </Flex>
        <Flex align="center" gap={8}>
          <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivas</span>
          <Switch checked={showInactive} onChange={onShowInactiveChange} size="small" />
          <Select
            mode="multiple"
            allowClear
            placeholder="Filtrar por empresa(s)"
            value={selectedCompanyIds}
            onChange={(values) => onCompanyIdsChange(values as number[])}
            options={companies.map((company) => ({
              value: company.id,
              label: company.nombre,
            }))}
            style={{ minWidth: 220 }}
          />
        </Flex>
      </Flex>

      {filters}
      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        className={`${styles.configTable} ${styles.companiesTable}`}
        pagination={{
          pageSize,
          showSizeChanger: false,
          showTotal: totalLabel,
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          style: { cursor: canEdit ? 'pointer' : 'default' },
        })}
      />
    </div>
  );
}
