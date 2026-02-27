import {
  Button,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Col,
  Select,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CloseOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type {
  AccountingAccountOption,
  PayrollArticleAuditTrailItem,
  PayrollArticleListItem,
  PayrollArticleType,
  PersonalActionType,
} from '../../../../api/payrollArticles';
import { optionalNoSqlInjection, textRules } from '../../../../lib/formValidation';
import styles from '../../configuration/UsersManagementPage.module.css';
import type { PayrollArticleFormValues } from '../payrollArticles.types';
import { formatAccountLabel } from '../payrollArticles.utils';

interface PayrollArticleModalProps {
  open: boolean;
  editing: PayrollArticleListItem | null;
  canInactivate: boolean;
  canReactivate: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canViewAudit: boolean;
  activeTab: string;
  onTabChange: (key: string) => void;
  loadingDetail: boolean;
  loadingCatalogs: boolean;
  loadingFormAccounts: boolean;
  form: FormInstance<PayrollArticleFormValues>;
  onSubmit: () => void;
  onValuesChange: (changed: Partial<PayrollArticleFormValues>) => void;
  auditTrail: PayrollArticleAuditTrailItem[];
  loadingAuditTrail: boolean;
  auditColumns: ColumnsType<PayrollArticleAuditTrailItem>;
  onClose: () => void;
  onInactivate: (row: PayrollArticleListItem) => Promise<void>;
  onReactivate: (row: PayrollArticleListItem) => Promise<void>;
  companies: Array<{ id: number; nombre: string }>;
  activeCompanyIds: Set<number>;
  activeArticleTypes: PayrollArticleType[];
  activeActionTypes: PersonalActionType[];
  activeArticleTypeIds: Set<number>;
  activeActionTypeIds: Set<number>;
  tipoArticuloMap: Map<number, string>;
  tipoAccionMap: Map<number, string>;
  activeFormAccounts: AccountingAccountOption[];
  currentPrimaryAccount?: AccountingAccountOption | null;
  currentPasivoAccount?: AccountingAccountOption | null;
  primaryLabel: string;
  secondaryLabel: string;
  allowsPasivo: boolean;
  canLoadAccountOptions: boolean;
  saving: boolean;
}

/**
 * @param props - Propiedades del modal de articulos.
 * @returns Modal con formulario y bitacora.
 */
export function PayrollArticleModal(props: PayrollArticleModalProps) {
  const {
    open,
    editing,
    canInactivate,
    canReactivate,
    canCreate,
    canEdit,
    canViewAudit,
    activeTab,
    onTabChange,
    loadingDetail,
    loadingCatalogs,
    loadingFormAccounts,
    form,
    onSubmit,
    onValuesChange,
    auditTrail,
    loadingAuditTrail,
    auditColumns,
    onClose,
    onInactivate,
    onReactivate,
    companies,
    activeCompanyIds,
    activeArticleTypes,
    activeActionTypes,
    activeArticleTypeIds,
    activeActionTypeIds,
    tipoArticuloMap,
    tipoAccionMap,
    activeFormAccounts,
    currentPrimaryAccount,
    currentPasivoAccount,
    primaryLabel,
    secondaryLabel,
    allowsPasivo,
    canLoadAccountOptions,
    saving,
  } = props;

  const editingId = editing?.id ?? null;
  const singleCompany = companies.length === 1 ? companies[0] : null;
  const singleCompanyLabel = singleCompany
    ? (singleCompany.nombre?.trim() || `Empresa #${singleCompany.id}`)
    : '';

  const tabItems = [
    {
      key: 'principal',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Informacion Principal
        </span>
      ),
      children: (
        <Spin spinning={loadingDetail || loadingCatalogs || loadingFormAccounts}>
          <Row gutter={[12, 12]} className={styles.companyFormGrid}>
            {editing?.idEmpresa && !activeCompanyIds.has(editing.idEmpresa) ? (
              <>
                <Col span={12}>
                  <Form.Item name="idEmpresa" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Empresa actual">
                    <Flex align="center" gap={8}>
                      <Input value={`Empresa #${editing.idEmpresa}`} disabled />
                      <Tag className={styles.tagInactivo}>Inactivo</Tag>
                    </Flex>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="idEmpresaCambio" label="Cambiar a empresa activa">
                    <Select
                      placeholder="Seleccionar"
                      options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                    />
                  </Form.Item>
                </Col>
              </>
            ) : singleCompany ? (
              <Col span={12}>
                <Form.Item name="idEmpresa" hidden>
                  <Input />
                </Form.Item>
                <Form.Item label="Empresa *">
                  <Input value={singleCompanyLabel} disabled />
                </Form.Item>
              </Col>
            ) : (
              <Col span={12}>
                <Form.Item name="idEmpresa" label="Empresa *" rules={[{ required: true }]}>
                  <Select
                    disabled={!!editing}
                    placeholder="Seleccionar"
                    options={companies.map((c) => ({ value: c.id, label: c.nombre }))}
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item name="nombre" label="Nombre Articulo *" rules={textRules({ required: true, max: 200 })}>
                <Input placeholder="Nombre articulo" maxLength={200} />
              </Form.Item>
            </Col>
            <Col span={12}>
              {editing?.idTipoArticuloNomina && !activeArticleTypeIds.has(editing.idTipoArticuloNomina) ? (
                <>
                  <Form.Item name="idTipoArticuloNomina" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Tipo articulo actual">
                    <Flex align="center" gap={8}>
                      <Input value={tipoArticuloMap.get(editing.idTipoArticuloNomina) ?? `Tipo #${editing.idTipoArticuloNomina}`} disabled />
                      <Tag className={styles.tagInactivo}>Inactivo</Tag>
                    </Flex>
                  </Form.Item>
                  <Form.Item name="idTipoArticuloNominaCambio" label="Cambiar a tipo activo">
                    <Select
                      placeholder="Seleccionar"
                      options={activeArticleTypes.map((t) => ({ value: t.id, label: t.nombre }))}
                    />
                  </Form.Item>
                </>
              ) : (
                <Form.Item name="idTipoArticuloNomina" label="Tipo Articulo Nomina *" rules={[{ required: true }]}>
                  <Select
                    placeholder="Seleccionar"
                    options={activeArticleTypes.map((t) => ({ value: t.id, label: t.nombre }))}
                  />
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              {editing?.idTipoAccionPersonal && !activeActionTypeIds.has(editing.idTipoAccionPersonal) ? (
                <>
                  <Form.Item name="idTipoAccionPersonal" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label="Tipo accion actual">
                    <Flex align="center" gap={8}>
                      <Input value={tipoAccionMap.get(editing.idTipoAccionPersonal) ?? `Accion #${editing.idTipoAccionPersonal}`} disabled />
                      <Tag className={styles.tagInactivo}>Inactivo</Tag>
                    </Flex>
                  </Form.Item>
                  <Form.Item name="idTipoAccionPersonalCambio" label="Cambiar a tipo activo">
                    <Select
                      placeholder="Seleccionar"
                      options={activeActionTypes.map((t) => ({ value: t.id, label: t.nombre }))}
                    />
                  </Form.Item>
                </>
              ) : (
                <Form.Item name="idTipoAccionPersonal" label="Tipo Accion Personal *" rules={[{ required: true }]}>
                  <Select
                    placeholder="Seleccionar"
                    options={activeActionTypes.map((t) => ({ value: t.id, label: t.nombre }))}
                  />
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              {editing?.idCuentaGasto && (!currentPrimaryAccount || currentPrimaryAccount.esInactivo === 1) ? (
                <>
                  <Form.Item name="idCuentaGasto" hidden>
                    <Input />
                  </Form.Item>
                  <Form.Item label={`${primaryLabel} actual`}>
                    <Flex align="center" gap={8}>
                      <Input
                        value={currentPrimaryAccount
                          ? (formatAccountLabel(currentPrimaryAccount) || `Cuenta #${editing.idCuentaGasto}`)
                          : `Cuenta #${editing.idCuentaGasto} (no disponible)`}
                        disabled
                      />
                      <Tag className={styles.tagInactivo}>
                        {currentPrimaryAccount ? 'Inactivo' : 'No disponible'}
                      </Tag>
                    </Flex>
                  </Form.Item>
                  <Form.Item name="idCuentaGastoCambio" label={`Cambiar a ${primaryLabel} activa`} rules={[{ required: true }]}>
                    <Select
                      placeholder="Seleccionar"
                      options={activeFormAccounts.map((account) => ({
                        value: account.id,
                        label: formatAccountLabel(account),
                      }))}
                    />
                  </Form.Item>
                </>
              ) : (
                <Form.Item name="idCuentaGasto" label={`${primaryLabel} *`} rules={[{ required: true }]}>
                  <Select
                    placeholder={canLoadAccountOptions ? 'Seleccionar' : 'Seleccione Empresa y Tipo Articulo primero'}
                    disabled={!canLoadAccountOptions}
                    options={activeFormAccounts.map((account) => ({
                      value: account.id,
                      label: formatAccountLabel(account),
                    }))}
                  />
                </Form.Item>
              )}
            </Col>
            {allowsPasivo && (
              <Col span={12}>
                {editing?.idCuentaPasivo && (!currentPasivoAccount || currentPasivoAccount.esInactivo === 1) ? (
                  <>
                    <Form.Item name="idCuentaPasivo" hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item label="Cuenta pasivo actual">
                      <Flex align="center" gap={8}>
                        <Input
                          value={currentPasivoAccount
                            ? (formatAccountLabel(currentPasivoAccount) || `Cuenta #${editing.idCuentaPasivo}`)
                            : `Cuenta #${editing.idCuentaPasivo} (no disponible)`}
                          disabled
                        />
                        <Tag className={styles.tagInactivo}>
                          {currentPasivoAccount ? 'Inactivo' : 'No disponible'}
                        </Tag>
                      </Flex>
                    </Form.Item>
                    <Form.Item name="idCuentaPasivoCambio" label="Cambiar a cuenta pasivo activa">
                      <Select
                        placeholder="Seleccionar"
                        options={activeFormAccounts.map((account) => ({
                          value: account.id,
                          label: formatAccountLabel(account),
                        }))}
                      />
                    </Form.Item>
                  </>
                ) : (
                  <Form.Item name="idCuentaPasivo" label={secondaryLabel}>
                    <Select
                      placeholder={canLoadAccountOptions ? 'Seleccionar' : 'Seleccione Empresa y Tipo Articulo primero'}
                      disabled={!canLoadAccountOptions}
                      options={activeFormAccounts.map((account) => ({
                        value: account.id,
                        label: formatAccountLabel(account),
                      }))}
                    />
                  </Form.Item>
                )}
              </Col>
            )}
            <Col span={24}>
              <Form.Item name="descripcion" label="Descripcion" rules={[{ validator: optionalNoSqlInjection }]}>
                <Input.TextArea rows={3} placeholder="Descripcion" maxLength={2000} />
              </Form.Item>
            </Col>
          </Row>
        </Spin>
      ),
    },
  ];

  if (canViewAudit && editingId) {
    tabItems.push({
      key: 'bitacora',
      label: (
        <span>
          <SearchOutlined style={{ marginRight: 8, fontSize: 16 }} />
          Bitacora
        </span>
      ),
      children: (
        <Spin spinning={loadingAuditTrail}>
          <div style={{ paddingTop: 8 }}>
            <p className={styles.sectionTitle}>Historial de cambios del articulo de nomina</p>
            <p className={styles.sectionDescription}>
              Muestra quien hizo el cambio, cuando lo hizo y el detalle registrado en bitacora.
            </p>
            <Table
              columns={auditColumns}
              dataSource={auditTrail}
              rowKey="id"
              size="small"
              loading={loadingAuditTrail}
              className={`${styles.configTable} ${styles.auditTableCompact}`}
              pagination={{
                pageSize: 8,
                showSizeChanger: true,
                showTotal: (total) => `${total} registro(s)`,
              }}
              locale={{ emptyText: 'No hay registros de bitacora para este articulo de nomina.' }}
            />
          </div>
        </Spin>
      ),
    });
  }

  return (
    <Modal
      className={styles.companyModal}
      open={open}
      onCancel={onClose}
      closable={false}
      footer={null}
      width={860}
      destroyOnHidden
      title={(
        <Flex justify="space-between" align="center" wrap="nowrap" style={{ width: '100%', gap: 16 }}>
          <div className={styles.companyModalHeader}>
            <div className={styles.companyModalHeaderIcon}>
              <FileTextOutlined />
            </div>
            <span>{editing ? 'Editar Articulo de Nomina' : 'Crear Articulo de Nomina'}</span>
          </div>
          <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
            {editing ? (
              <div className={styles.companyModalEstadoPaper}>
                <span style={{ fontWeight: 500, fontSize: 14, color: editing.esInactivo === 1 ? '#64748b' : '#20638d' }}>
                  {editing.esInactivo === 1 ? 'Inactivo' : 'Activo'}
                </span>
                <Switch
                  checked={editing.esInactivo === 0}
                  disabled={editing.esInactivo === 0 ? !canInactivate : !canReactivate}
                  onChange={(checked) => {
                    if (!editing) return;
                    Modal.confirm({
                      title: checked ? 'Reactivar articulo de nomina' : 'Inactivar articulo de nomina',
                      content: checked
                        ? 'El articulo de nomina volvera a estar disponible.'
                        : 'El articulo de nomina quedara inactivo.',
                      okText: checked ? 'Reactivar' : 'Inactivar',
                      cancelText: 'Cancelar',
                      centered: true,
                      width: 420,
                      rootClassName: styles.companyConfirmModal,
                      okButtonProps: { className: styles.companyConfirmOk },
                      cancelButtonProps: { className: styles.companyConfirmCancel },
                      icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />,
                      onOk: async () => {
                        if (checked) {
                          await onReactivate(editing);
                        } else {
                          await onInactivate(editing);
                        }
                        onClose();
                      },
                    });
                  }}
                />
              </div>
            ) : null}
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              aria-label="Cerrar"
              className={styles.companyModalCloseBtn}
            />
          </Flex>
        </Flex>
      )}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        onValuesChange={onValuesChange}
        preserve={false}
        className={styles.companyFormContent}
      >
        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          className={`${styles.tabsWrapper} ${styles.companyModalTabs}`}
          items={tabItems}
        />
        <div className={styles.companyModalFooter}>
          <Button onClick={onClose} className={styles.companyModalBtnCancel}>
            Cancelar
          </Button>
          {(editing ? canEdit : canCreate) && (
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={loadingCatalogs}
              icon={editing ? <EditOutlined /> : <PlusOutlined />}
              className={styles.companyModalBtnSubmit}
            >
              {editing ? 'Guardar cambios' : 'Crear Articulo'}
            </Button>
          )}
        </div>
      </Form>
    </Modal>
  );
}
