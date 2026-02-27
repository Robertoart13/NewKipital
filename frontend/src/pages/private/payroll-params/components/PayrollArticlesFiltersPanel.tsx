import { Badge, Button, Checkbox, Col, Collapse, Flex, Input, Row, Space } from 'antd';
import {
  DownOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { PaneConfig, PaneKey, PaneOption } from '../payrollArticles.types';
import styles from '../../configuration/UsersManagementPage.module.css';

interface PayrollArticlesFiltersPanelProps {
  filtersExpanded: boolean;
  onToggleFilters: (expanded: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  paneConfig: PaneConfig[];
  paneSearch: Record<PaneKey, string>;
  onPaneSearchChange: (key: PaneKey, value: string) => void;
  paneOptions: Record<PaneKey, PaneOption[]>;
  paneSelections: Record<PaneKey, string[]>;
  onPaneSelectionsChange: (key: PaneKey, selections: string[]) => void;
  paneOpen: Record<PaneKey, boolean>;
  onPaneToggle: (key: PaneKey, open: boolean) => void;
  onClearPane: (key: PaneKey) => void;
  onOpenAll: () => void;
  onCollapseAll: () => void;
  onClearAll: () => void;
}

/**
 * @param props - Propiedades del panel de filtros.
 * @returns Panel de filtros con panes colapsables.
 */
export function PayrollArticlesFiltersPanel(props: PayrollArticlesFiltersPanelProps) {
  const {
    filtersExpanded,
    onToggleFilters,
    search,
    onSearchChange,
    paneConfig,
    paneSearch,
    onPaneSearchChange,
    paneOptions,
    paneSelections,
    onPaneSelectionsChange,
    paneOpen,
    onPaneToggle,
    onClearPane,
    onOpenAll,
    onCollapseAll,
    onClearAll,
  } = props;

  return (
    <Collapse
      activeKey={filtersExpanded ? ['filtros'] : []}
      onChange={(keys) => onToggleFilters((Array.isArray(keys) ? keys : [keys]).includes('filtros'))}
      className={styles.filtersCollapse}
      items={[
        {
          key: 'filtros',
          label: 'Filtros',
          children: (
            <>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
            className={styles.searchInput}
            style={{ maxWidth: 240 }}
          />
          <Flex gap={8}>
            <Button size="small" onClick={onCollapseAll}>Collapse All</Button>
            <Button size="small" onClick={onOpenAll}>Show All</Button>
            <Button size="small" onClick={onClearAll}>Limpiar Todo</Button>
          </Flex>
        </Flex>
        <Row gutter={[12, 12]}>
          {paneConfig.map((pane) => (
            <Col xs={24} md={12} xl={8} key={pane.key}>
              <div className={styles.paneCard}>
                <Flex gap={6} align="center" wrap="wrap">
                  <Input
                    value={paneSearch[pane.key]}
                    onChange={(e) => onPaneSearchChange(pane.key, e.target.value)}
                    placeholder={pane.title}
                    prefix={<SearchOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />}
                    suffix={(
                      <Flex gap={2}>
                        <SortAscendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                        <SortDescendingOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
                      </Flex>
                    )}
                    size="middle"
                    className={styles.filterInput}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  <Button
                    size="middle"
                    icon={<SearchOutlined />}
                    onClick={() => onPaneToggle(pane.key, true)}
                    title="Abrir opciones"
                  />
                  <Button size="middle" onClick={() => onClearPane(pane.key)} title="Limpiar">
                    x
                  </Button>
                  <Button
                    size="middle"
                    icon={paneOpen[pane.key] ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => onPaneToggle(pane.key, !paneOpen[pane.key])}
                    title={paneOpen[pane.key] ? 'Colapsar' : 'Expandir'}
                  />
                </Flex>
                {paneOpen[pane.key] && (
                  <div className={styles.paneOptionsBox}>
                    <Checkbox.Group
                      value={paneSelections[pane.key]}
                      onChange={(values) => onPaneSelectionsChange(pane.key, values as string[])}
                      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                    >
                      {paneOptions[pane.key].map((option) => (
                        <Checkbox key={`${pane.key}:${option.value}`} value={option.value}>
                          <Space>
                            <span>{option.value}</span>
                            <Badge count={option.count} style={{ backgroundColor: '#5a6c7d' }} />
                          </Space>
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                    {paneOptions[pane.key].length === 0 && (
                      <span className={styles.emptyHint}>Sin valores para este filtro</span>
                    )}
                  </div>
                )}
              </div>
            </Col>
          ))}
        </Row>
            </>
          ),
        },
      ]}
    >
    </Collapse>
  );
}
