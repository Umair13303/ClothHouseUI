import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';
import { MenuService } from './menu.service';

const ACCESS_TOKEN_KEY = 'clothpos.accessToken';
const REFRESH_TOKEN_KEY = 'clothpos.refreshToken';
const USER_KEY = 'clothpos.user';

/**
 * Holds the JWT access/refresh token pair in localStorage (this is a
 * single-PC shop till, not a multi-tenant web app, so the usual
 * httpOnly-cookie recommendation is overkill here) and exposes the current
 * user as a signal so the shell/nav can react to login/logout instantly.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(this.readUser());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  constructor(private http: HttpClient, private router: Router, private menuService: MenuService) {
    // Deferred: firing the request inside the constructor makes the auth
    // interceptor inject(AuthService) while it is still being constructed,
    // which throws before the request ever reaches the network.
    if (this.currentUserSignal()) queueMicrotask(() => this.menuService.load().subscribe());
  }

  login(userName: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { userName, password })
      .pipe(tap((res) => this.storeSession(res)));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(tap((res) => this.storeSession(res)));
  }

  logout(navigateToLogin = true): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      // Best-effort revoke; we clear local state regardless of the result.
      this.http.post(`${environment.apiUrl}/auth/revoke`, { refreshToken }).subscribe({ error: () => void 0 });
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
    this.menuService.clear();
    if (navigateToLogin) this.router.navigateByUrl('/login');
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    return this.currentUserSignal()?.roles.includes(role) ?? false;
  }

  private storeSession(res: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUserSignal.set(res.user);
    this.menuService.load().subscribe();
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      // Corrupt leftover from an older session must not kill app bootstrap.
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
