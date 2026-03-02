import { describe, expect, it } from 'vitest';
import { getVisibleMenuItems } from './menu.selectors';
import menuReducer from '../slices/menuSlice';

function buildState(permissions: string[]) {
  return {
    menu: menuReducer(undefined, { type: '@@INIT' }),
    permissions: { permissions },
  } as any;
}

function findMenuItemById(items: Array<{ id: string; children?: any[] }>, id: string): any | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children?.length) {
      const nested = findMenuItemById(item.children, id);
      if (nested) return nested;
    }
  }
  return null;
}

describe('menu.selectors permissions filtering', () => {
  it('hides incapacidades when specific permission is missing', () => {
    const visible = getVisibleMenuItems(buildState(['hr_action:view']));
    expect(findMenuItemById(visible, 'incapacidades')).toBeNull();
  });

  it('shows incapacidades when specific permission is present', () => {
    const visible = getVisibleMenuItems(
      buildState(['hr_action:view', 'hr-action-incapacidades:view']),
    );
    expect(findMenuItemById(visible, 'incapacidades')).not.toBeNull();
  });

  it('hides descuentos when specific permission is missing', () => {
    const visible = getVisibleMenuItems(buildState(['hr_action:view']));
    expect(findMenuItemById(visible, 'descuentos')).toBeNull();
  });

  it('shows descuentos when specific permission is present', () => {
    const visible = getVisibleMenuItems(
      buildState(['hr_action:view', 'hr-action-descuentos:view']),
    );
    expect(findMenuItemById(visible, 'descuentos')).not.toBeNull();
  });

  it('removes personal-actions entirely when no personal-action permission is present', () => {
    const visible = getVisibleMenuItems(buildState(['employee:view']));
    expect(findMenuItemById(visible, 'personal-actions')).toBeNull();
  });
});
