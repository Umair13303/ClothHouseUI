import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { MenuService } from '../services/menu.service';

/**
 * Requires route data: { menuKey: '...' } and CanView on that key.
 * Waits on whenLoaded() so this never races the initial my-menu fetch that
 * fires right after login/app-init — evaluating canView() before that
 * settles would spuriously deny every route and redirect-loop back to '/'.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const menuService = inject(MenuService);
  const router = inject(Router);

  const menuKey = route.data['menuKey'] as string | undefined;
  if (!menuKey) return true;

  return menuService.whenLoaded().pipe(
    map(() => {
      if (menuService.canView(menuKey)) return true;
      // An empty menu means the stored session is stale/broken (e.g. tokens
      // left over from a previous run): drop it and go to login. Redirecting
      // to '/' here would re-run this guard on the dashboard route and
      // redirect to '/' again — an infinite navigation loop that freezes
      // the tab on a white page.
      const links = menuService.menuTree().flatMap((g) => g.links);
      if (links.length === 0) {
        authService.logout(false);
        return router.createUrlTree(['/login']);
      }
      // Dashboard itself denied: send the user to their first viewable
      // screen instead of '/' (same loop otherwise).
      if (menuKey === 'dashboard') {
        const first = links.find((l) => l.path);
        if (!first?.path) {
          authService.logout(false);
          return router.createUrlTree(['/login']);
        }
        return router.createUrlTree([first.path]);
      }
      return router.createUrlTree(['/']);
    })
  );
};
