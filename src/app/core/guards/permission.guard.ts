import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { MenuService } from '../services/menu.service';

/**
 * Requires route data: { menuKey: '...' } and CanView on that key.
 * Waits on whenLoaded() so this never races the initial my-menu fetch that
 * fires right after login/app-init — evaluating canView() before that
 * settles would spuriously deny every route and redirect-loop back to '/'.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const menuService = inject(MenuService);
  const router = inject(Router);

  const menuKey = route.data['menuKey'] as string | undefined;
  if (!menuKey) return true;

  return menuService.whenLoaded().pipe(map(() => menuService.canView(menuKey) || router.createUrlTree(['/'])));
};
