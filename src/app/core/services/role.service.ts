import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MenuItemAdmin, Role, RolePermission, UpdateRolePermissionItem } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly rolesUrl = `${environment.apiUrl}/roles`;
  private readonly menuUrl = `${environment.apiUrl}/menu`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.rolesUrl);
  }

  createRole(name: string): Observable<Role> {
    return this.http.post<Role>(this.rolesUrl, { name });
  }

  renameRole(id: string, name: string): Observable<Role> {
    return this.http.put<Role>(`${this.rolesUrl}/${id}`, { name });
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.rolesUrl}/${id}`);
  }

  getPermissions(roleId: string): Observable<RolePermission[]> {
    return this.http.get<RolePermission[]>(`${this.rolesUrl}/${roleId}/permissions`);
  }

  setPermissions(roleId: string, permissions: UpdateRolePermissionItem[]): Observable<void> {
    return this.http.put<void>(`${this.rolesUrl}/${roleId}/permissions`, { permissions });
  }

  getAdminMenuTree(): Observable<MenuItemAdmin[]> {
    return this.http.get<MenuItemAdmin[]>(`${this.menuUrl}/admin-tree`);
  }
}
