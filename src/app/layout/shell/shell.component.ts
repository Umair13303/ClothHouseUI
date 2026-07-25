import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { Component, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { ThemeService } from '../../core/services/theme.service';
import { NavGroup } from '../../core/models/menu.model';

/** Routes that auto-collapse the sidenav for maximum screen space (re-openable via the hamburger toggle). */
const AUTO_COLLAPSE_ROUTE_PREFIXES = ['/sales/pos'];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  isMobile = signal(false);
  isCollapsibleRoute = signal(false);
  sidenavOpened = signal(true);
  navGroups: Signal<NavGroup[]>;

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public menuService: MenuService,
    breakpointObserver: BreakpointObserver,
    router: Router
  ) {
    this.navGroups = this.menuService.menuTree;

    breakpointObserver
      .observe(Breakpoints.HandsetPortrait + ', ' + Breakpoints.HandsetLandscape + ', (max-width: 900px)')
      .pipe(takeUntilDestroyed())
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        this.sidenavOpened.set(!result.matches && !this.isCollapsibleRoute());
      });

    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((e) => {
        const collapse = AUTO_COLLAPSE_ROUTE_PREFIXES.some((prefix) => e.urlAfterRedirects.startsWith(prefix));
        this.isCollapsibleRoute.set(collapse);
        if (!this.isMobile()) this.sidenavOpened.set(!collapse);
      });
  }

  closeOnMobileNav(): void {
    if (this.isMobile()) {
      this.sidenavOpened.set(false);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
