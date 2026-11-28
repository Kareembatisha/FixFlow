import { NAV_ITEMS, navItemsFor, ROLE_HOME, rolesFor } from './navigation.config';
import { USER_ROLES } from '../models/user.model';

describe('navigation config', () => {
  it('gives each role exactly its links', () => {
    const labels = (role: Parameters<typeof navItemsFor>[0]) =>
      navItemsFor(role).map((i) => i.label);
    expect(labels('customer')).toEqual(['My requests', 'Profile']);
    expect(labels('technician')).toEqual(['My tasks', 'Profile']);
    expect(labels('supervisor')).toEqual(['Requests', 'Team overview', 'Profile']);
    expect(labels('admin')).toEqual(['Dashboard', 'Requests', 'Users', 'Profile']);
  });

  it('shows nothing when signed out', () => {
    expect(navItemsFor(null)).toEqual([]);
  });

  it('every role lands on a page it is allowed to open', () => {
    for (const role of USER_ROLES) {
      const home = NAV_ITEMS.find((i) => i.path === ROLE_HOME[role]);
      expect(home?.roles).toContain(role);
    }
  });

  it('derives route roles from the same source and rejects unknown paths', () => {
    expect(rolesFor('/dashboard')).toEqual(['admin']);
    expect(() => rolesFor('/nope')).toThrow();
  });
});
