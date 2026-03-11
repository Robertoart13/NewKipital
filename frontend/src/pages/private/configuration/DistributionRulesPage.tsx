import {
  App as AntdApp,
  Button,
  Card,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchDistributionRules,
  inactivateDistributionRule,
  reactivateDistributionRule,
  type DistributionRuleItem,
} from '../../../api/distributionRules';
import { useAppSelector } from '../../../store/hooks';
import { hasPermission } from '../../../store/selectors/permissions.selectors';

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

  const loadRows = useCallback(async () => {
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
      await loadRows();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'No fue posible cambiar el estado de la regla.');
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" size={2}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Regla de Distribucion
          </Typography.Title>
          <Typography.Text type="secondary">
            Configure reglas globales o por departamento/puesto para mapear tipo de accion personal a cuenta contable.
          </Typography.Text>
        </Space>
      </Card>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            allowClear
            style={{ minWidth: 260 }}
            placeholder="Filtrar por empresa"
            options={companyOptions}
            value={selectedCompanyId}
            onChange={(value) => setSelectedCompanyId(value)}
          />
          <Select
            allowClear
            style={{ minWidth: 220 }}
            placeholder="Tipo de regla"
            options={[
              { value: 1, label: 'Global' },
              { value: 0, label: 'Especifica' },
            ]}
            value={globalFilter}
            onChange={(value) => setGlobalFilter(value)}
          />

          <Space size={6}>
            <Typography.Text type="secondary">Mostrar inactivas</Typography.Text>
            <Switch checked={showInactive} onChange={setShowInactive} />
          </Space>

          <Button icon={<ReloadOutlined />} onClick={() => void loadRows()}>
            Refrescar
          </Button>

          {canEdit ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/configuration/reglas-distribucion/crear')}
            >
              Crear Regla de Distribucion
            </Button>
          ) : null}
        </Space>

        <Table<DistributionRuleItem>
          rowKey="publicId"
          loading={loading}
          dataSource={rows}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total, range) =>
              `Mostrando ${range[0]} a ${range[1]} de ${total} registros`,
          }}
          onRow={(record) => ({
            onClick: () => navigate(`/configuration/reglas-distribucion/editar/${record.publicId}`),
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
                row.esReglaGlobal === 1 ? <Tag color="blue">Global</Tag> : <Tag>Especifica</Tag>,
            },
            {
              title: 'Ambito',
              key: 'ambito',
              render: (_, row) => {
                if (row.esReglaGlobal === 1) return 'Toda la empresa';
                if (row.nombrePuesto) return `${row.nombreDepartamento ?? '-'} / ${row.nombrePuesto}`;
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
      </Card>
    </div>
  );
}
