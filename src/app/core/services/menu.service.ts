import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, catchError, filter, map, of, take, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NavGroup, NavLink } from '../models/menu.model';

interface RawMenuLink {
  key: string;
  label: string;
  icon: string | null;
  route: string | null;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}
interface RawMenuGroup {
  label: string;
  links: RawMenuLink[];
}

/**
 * Fetches the current user's nav menu (already filtered to CanView=true
 * items, with CanAdd/Edit/Delete carried alongside) from
 * GET /api/menu/my-menu — the single source of truth for both what the
 * shell renders and what action buttons other screens show.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly baseUrl = `${environment.apiUrl}/menu`;

  menuTree = signal<NavGroup[]>([]);
  /** True once the first load() (success or failure) has settled — lets guards wait instead of racing it. */
  loaded = signal(false);
  private linksByKey = signal<Map<string, NavLink>>(new Map());

  constructor(private http: HttpClient) {}

  /** Callers must subscribe (or it won't fire): AuthService does so on login/app-init. */
  load(): Observable<void> {
    return this.http.get<RawMenuGroup[]>(`${this.baseUrl}/my-menu`).pipe(
      tap((groups) => this.applyMenu(groups)),
      map(() => void 0),
      catchError(() => {
        this.clear();
        return of(void 0);
      })
    );
  }

  clear(): void {
    this.menuTree.set([]);
    this.linksByKey.set(new Map());
    this.loaded.set(true);
  }

  /** Resolves once load() has settled at least once, so route guards never race the initial fetch. */
  whenLoaded(): Observable<boolean> {
    if (this.loaded()) return of(true);
    return toObservable(this.loaded).pipe(
      filter((v) => v),
      take(1)
    );
  }

  /** A menu key only ever appears here if the user's roles grant CanView. */
  canView(key: string): boolean {
    return this.linksByKey().has(key);
  }

  can(key: string, action: 'add' | 'edit' | 'delete'): boolean {
    const link = this.linksByKey().get(key);
    if (!link) return false;
    return action === 'add' ? link.canAdd : action === 'edit' ? link.canEdit : link.canDelete;
  }

  private applyMenu(groups: RawMenuGroup[]): void {
    const mapped: NavGroup[] = groups.map((g) => ({
      label: g.label,
      links: g.links.map((l) => ({
        key: l.key,
        path: l.route,
        label: l.label,
        icon: l.icon,
        canAdd: l.canAdd,
        canEdit: l.canEdit,
        canDelete: l.canDelete
      }))
    }));
    this.menuTree.set(mapped);

    const byKey = new Map<string, NavLink>();
    for (const group of mapped) {
      for (const link of group.links) byKey.set(link.key, link);
    }
    this.linksByKey.set(byKey);
    this.loaded.set(true);
  }
}
