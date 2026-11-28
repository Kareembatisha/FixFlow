import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { signInAs } from '../../../testing/test-utils';
import { UserRole } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { Shell } from './shell';

@Component({ template: '' })
class Blank {}

describe('Shell (navbar + sidebar)', () => {
  let fixture: ComponentFixture<Shell>;
  let el: HTMLElement;
  let auth: AuthService;
  let ctrl: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(role: UserRole) {
    await signInAs(auth, ctrl, role);
    fixture = TestBed.createComponent(Shell);
    el = fixture.nativeElement;
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const links = () => Array.from(el.querySelectorAll('nav a')).map((a) => a.textContent!.trim());

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([{ path: '**', component: Blank }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    ctrl = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => localStorage.clear());

  it.each<[UserRole, string[]]>([
    ['customer', ['My requests', 'Profile']],
    ['technician', ['My tasks', 'Profile']],
    ['supervisor', ['Requests', 'Team overview', 'Profile']],
    ['admin', ['Dashboard', 'Requests', 'Users', 'Profile']],
  ])('%s sees only its own navigation', async (role, expected) => {
    await render(role);
    expect(links()).toEqual(expected);
  });

  it('shows the user name and role in the navbar', async () => {
    await render('supervisor');
    expect(el.querySelector('.name')?.textContent).toContain('Test supervisor');
    expect(el.querySelector('[data-testid=role-badge]')?.textContent).toBe('Supervisor');
  });

  it('customer navigation has no admin links', async () => {
    await render('customer');
    expect(links()).not.toContain('Dashboard');
    expect(links()).not.toContain('Users');
  });

  it('navigation reacts when the session changes', async () => {
    await render('admin');
    expect(links()).toContain('Dashboard');

    auth.clearSession();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(links()).toEqual([]);
    expect(el.querySelector('.logout')).toBeNull();
  });

  it('logout clears the session and redirects to /login', async () => {
    await render('customer');
    el.querySelector<HTMLButtonElement>('.logout')!.click();
    await fixture.whenStable();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem('fixflow.accessToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('opens and closes the mobile drawer (menu button, link click, Escape)', async () => {
    await render('customer');
    const sidebar = () => el.querySelector('nav')!;

    el.querySelector<HTMLButtonElement>('.menu')!.click();
    fixture.detectChanges();
    expect(sidebar().classList.contains('open')).toBe(true);

    sidebar().querySelector<HTMLAnchorElement>('a')!.click();
    fixture.detectChanges();
    expect(sidebar().classList.contains('open')).toBe(false);

    el.querySelector<HTMLButtonElement>('.menu')!.click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(sidebar().classList.contains('open')).toBe(false);
  });
});
