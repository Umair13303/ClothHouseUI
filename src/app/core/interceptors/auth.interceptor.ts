import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Attaches the current access token to every API call and, on a 401,
 * attempts exactly one silent refresh before giving up and logging out —
 * prevents an expired 30-minute access token from interrupting a cashier
 * mid-sale for a bad user experience.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');
  const token = authService.getAccessToken();

  const authedReq = token && !isAuthCall
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthCall || !authService.getRefreshToken()) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap(() => {
          const retried = req.clone({
            setHeaders: { Authorization: `Bearer ${authService.getAccessToken()}` }
          });
          return next(retried);
        }),
        catchError((refreshError) => {
          authService.logout();
          return throwError(() => refreshError);
        })
      );
    })
  );
};
