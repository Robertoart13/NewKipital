import { App as AntdApp, Button, Card, Flex, Input, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { AppstoreOutlined, ArrowLeftOutlined, FilterOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  fetchDistributionRules,
  inactivateDistributionRule,
  reactivateDistributionRule,
  type DistributionRuleItem,
} from '../../../api/distributionRules';
import { bustApiCache } from '../../../lib/apiCache';
import { useAppSelector } from '../../../store/hooks';
import { hasPermission } from '../../../store/selectors/permissions.selectors';

import styles from './UsersManagementPage.module.css';

interface OptionItem {
  value: number;
  label: string;
}

function toNumericId(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function DistributionRulesPage() {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();

  const canEdit = useAppSelector((state) => hasPermission(state, 'config:reglas-distribucion:edit'));

  const companies = useAppSelector((state) => state.auth.companies);
  const activeCompany = useAppSelector((state) => state.activeCompany.company);

  const companyOptions: OptionItem[] = useMemo(
    () =>
      companies
        .map((company) => {
          const id = toNumericId(company.id);
          if (!id) return null;
          return {
            value: id,
            label: company.nombre,
          };
        })
        .filter((option): option is OptionItem => option != null),
    [companies],
  );

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DistributionRuleItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(
    toNumericId(activeCompany?.id) ?? toNumericId(companies[0]?.id),
  );
  const [globalFilter, setGlobalFilter] = useState<number | undefined>(undefined);
  const [showInactive, setShowInactive] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  const loadRows = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      bustApiCache();
    }
    setLoading(true);
    try {
      const data = await fetchDistributionRules({
        idEmpresa: selectedCompanyId,
        esReglaGlobal: globalFilter,
        esActivo: showInactive ? undefined : 1,
      });
      setRows(data);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'No fue posible cargar reglas de distribucion.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [globalFilter, message, selectedCompanyId, showInactive]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      const empresa = (row.nombreEmpresa ?? '').toLowerCase();
      const ambito =
        row.esReglaGlobal === 1
          ? 'toda la empresa'
          : `${row.nombreDepartamento ?? ''} ${row.nombrePuesto ?? ''}`.toLowerCase();
      const tipo = row.esReglaGlobal === 1 ? 'global' : 'especifica';

      return (
        empresa.includes(term) ||
        ambito.includes(term) ||
        tipo.includes(term) ||
        String(row.totalAsignaciones ?? '').includes(term)
      );
    });
  }, [rows, search]);

  const handleToggle = async (row: DistributionRuleItem, activate: boolean) => {
    if (!canEdit) {
      message.error('No tiene permiso para editar reglas de distribucion.');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: activate ? 'Reactivar regla' : 'Inactivar regla',
        content: activate
          ? 'La regla volvera a estar disponible para uso operativo.'
          : 'La regla quedara inactiva y no se usara en nuevas configuraciones.',
        okText: activate ? 'Reactivar' : 'Inactivar',
        cancelText: 'Cancelar',
        centered: true,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    try {
      if (activate) {
        await reactivateDistributionRule(row.publicId);
        message.success('Regla reactivada correctamente.');
      } else {
        await inactivateDistributionRule(row.publicId);
        message.success('Regla inactivada correctamente.');
      }
      await loadRows(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No fue posible cambiar el estado de la regla.');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <Link className={styles.pageBackLink} to="/configuration">
            <ArrowLeftOutlined />
          </Link>
          <div className={styles.pageTitleBlock}>
            <h1 className={styles.pageTitle}>Reglas de Distribucion</h1>
            <p className={styles.pageSubtitle}>
              Configure reglas globales o por departamento/puesto para mapear tipo de accion personal a cuenta contable.
            </p>
          </div>
        </div>
      </div>

      <Card className={styles.mainCard} style={{ marginBottom: 20 }}>
        <div className={styles.mainCardBody}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={16}>
            <Flex align="center" gap={16}>
              <div className={styles.gestionIconWrap}>
                <AppstoreOutlined className={styles.gestionIcon} />
              </div>
              <div>
                <h2 className={styles.gestionTitle}>Gestion de Reglas de Distribucion</h2>
                <p className={styles.gestionDesc}>
                  Administre y consulte las reglas que vinculan tipos de accion personal con cuentas contables.
                </p>
              </div>
            </Flex>
            {canEdit ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className={`${styles.actionButton} ${styles.btnPrimary}`}
                onClick={() => navigate('/configuration/reglas-distribucion/crear')}
              >
                Crear Regla de Distribucion
              </Button>
            ) : null}
          </Flex>
        </div>
      </Card>

      <Card className={styles.mainCard}>
        <div className={styles.mainCardBody}>
          <Flex
            align="center"
            justify="space-between"
            wrap="wrap"
            gap={12}
            className={styles.registrosHeader}
          >
            <Flex align="center" gap={12} wrap="wrap">
              <Flex align="center" gap={8}>
                <FilterOutlined className={styles.registrosFilterIcon} />
                <h3 className={styles.registrosTitle}>Registros de Reglas de Distribucion</h3>
              </Flex>
              <Flex align="center" gap={6}>
                <Select
                  value={pageSize}
                  onChange={setPageSize}
                  options={[10, 20, 50, 100].map((n) => ({ label: String(n), value: n }))}
                  style={{ width: 70 }}
                />
                <span style={{ color: '#6b7a85', fontSize: 14 }}>entries per page</span>
              </Flex>
            </Flex>
            <Flex align="center" gap={8}>
              <span style={{ color: '#6b7a85', fontSize: 14 }}>Mostrar inactivas</span>
              <Switch checked={showInactive} onChange={setShowInactive} size="small" />
            </Flex>
          </Flex>

          <Flex
            align="center"
            justify="flex-end"
            wrap="wrap"
            gap={12}
            style={{ marginBottom: 16, marginTop: 8 }}
          >
            <Space size={12} wrap>
              <Select
                allowClear
                style={{ minWidth: 220 }}
                placeholder="Filtrar por empresa"
                options={companyOptions}
                value={selectedCompanyId}
                onChange={(value) => setSelectedCompanyId(value)}
              />
              <Select
                allowClear
                style={{ minWidth: 200 }}
                placeholder="Tipo de regla"
                options={[
                  { value: 1, label: 'Global' },
                  { value: 0, label: 'Especifica' },
                ]}
                value={globalFilter}
                onChange={(value) => setGlobalFilter(value)}
              />
              <Input.Search
                allowClear
                placeholder="Buscar por empresa, ambito o tipo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260 }}
              />
              <Button icon={<ReloadOutlined />} onClick={() => void loadRows(true)}>
                Refrescar
              </Button>
            </Space>
          </Flex>

          <Table<DistributionRuleItem>
            rowKey="publicId"
            loading={loading}
            dataSource={filteredRows}
            className={styles.configTable}
            pagination={{
              pageSize,
              showSizeChanger: false,
              showTotal: (total, range) =>
                `Mostrando ${range[0]} a ${range[1]} de ${total} registros`,
            }}
            onRow={(record) => ({
              onClick: () =>
                navigate(`/configuration/reglas-distribucion/editar/${record.publicId}`),
              style: { cursor: 'pointer' },
            })}
            columns={[
              {
                title: 'Empresa',
                dataIndex: 'nombreEmpresa',
                key: 'nombreEmpresa',
              },
              {
                title: 'Tipo',
                key: 'tipo',
                width: 140,
                render: (_, row) =>
                  row.esReglaGlobal === 1 ? (
                    <Tag color="blue">Global</Tag>
                  ) : (
                    <Tag>Especifica</Tag>
                  ),
              },
              {
                title: 'Ambito',
                key: 'ambito',
                render: (_, row) => {
                  if (row.esReglaGlobal === 1) return 'Toda la empresa';
                  if (row.nombrePuesto) {
                    return `${row.nombreDepartamento ?? '-'} / ${row.nombrePuesto}`;
                  }
                  return row.nombreDepartamento ?? '-';
                },
              },
              {
                title: 'Asignaciones',
                dataIndex: 'totalAsignaciones',
                key: 'totalAsignaciones',
                width: 120,
              },
              {
                title: 'Estado',
                key: 'estado',
                width: 120,
                render: (_, row) =>
                  row.estadoRegla === 1 ? (
                    <Tag color="green">Activa</Tag>
                  ) : (
                    <Tag color="default">Inactiva</Tag>
                  ),
              },
              {
                title: 'Acciones',
                key: 'acciones',
                width: 220,
                render: (_, row) => (
                  <Space>
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/configuration/reglas-distribucion/editar/${row.publicId}`);
                      }}
                    >
                      Editar
                    </Button>
                    {canEdit ? (
                      <Button
                        size="small"
                        danger={row.estadoRegla === 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggle(row, row.estadoRegla !== 1);
                        }}
                      >
                        {row.estadoRegla === 1 ? 'Inactivar' : 'Reactivar'}
                      </Button>
                    ) : null}
                  </Space>
                ),
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
