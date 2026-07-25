import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MenuItemAdmin, Role, RolePermission } from '../../../core/models/role.model';
import { NotificationService } from '../../../core/services/notification.service';
import { RoleService } from '../../../core/services/role.service';

interface PermissionGroup {
  label: string;
  rows: RolePermission[];
}

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './roles-permissions.component.html',
  styleUrl: './roles-permissions.component.scss'
})
export class RolesPermissionsComponent implements OnInit {
  roles = signal<Role[]>([]);
  menuItems = signal<MenuItemAdmin[]>([]);
  permissionRows = signal<RolePermission[]>([]);
  selectedRoleId = signal<string | null>(null);
  loadingPermissions = signal(false);
  savingPermissions = signal(false);

  newRoleName = '';
  editingRoleId: string | null = null;
  editRoleName = '';

  groupedRows = computed<PermissionGroup[]>(() => {
    const groups = this.menuItems()
      .filter((m) => m.parentId === null)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const rowsByParent = new Map<string, RolePermission[]>();
    for (const row of this.permissionRows()) {
      const key = row.parentId ?? '';
      if (!rowsByParent.has(key)) rowsByParent.set(key, []);
      rowsByParent.get(key)!.push(row);
    }

    return groups
      .map((g) => ({ label: g.label, rows: rowsByParent.get(g.id) ?? [] }))
      .filter((g) => g.rows.length > 0);
  });

  constructor(
    private roleService: RoleService,
    private confirmDialog: ConfirmService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
    this.roleService.getAdminMenuTree().subscribe({
      next: (items) => this.menuItems.set(items),
      error: () => this.notify.error('Failed to load menu structure.')
    });
  }

  loadRoles(): void {
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.notify.error('Failed to load roles.')
    });
  }

  selectRole(role: Role): void {
    this.selectedRoleId.set(role.id);
    this.loadingPermissions.set(true);
    this.roleService.getPermissions(role.id).subscribe({
      next: (rows) => {
        this.permissionRows.set(rows);
        this.loadingPermissions.set(false);
      },
      error: () => {
        this.notify.error('Failed to load permissions.');
        this.loadingPermissions.set(false);
      }
    });
  }

  toggleRow(row: RolePermission, on: boolean): void {
    row.canView = on;
    row.canAdd = on;
    row.canEdit = on;
    row.canDelete = on;
  }

  addRole(): void {
    const name = this.newRoleName.trim();
    if (!name) return;
    this.roleService.createRole(name).subscribe({
      next: () => {
        this.newRoleName = '';
        this.notify.success('Role created.');
        this.loadRoles();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Failed to create role.')
    });
  }

  startRename(role: Role): void {
    this.editingRoleId = role.id;
    this.editRoleName = role.name;
  }

  cancelRename(): void {
    this.editingRoleId = null;
  }

  saveRename(role: Role): void {
    const name = this.editRoleName.trim();
    if (!name) return;
    this.roleService.renameRole(role.id, name).subscribe({
      next: () => {
        this.editingRoleId = null;
        this.notify.success('Role renamed.');
        this.loadRoles();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Failed to rename role.')
    });
  }

  deleteRole(role: Role): void {
    this.confirmDialog
      .ask({
        title: 'Delete role?',
        message: `Delete role "${role.name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.roleService.deleteRole(role.id).subscribe({
          next: () => {
            this.notify.success('Role deleted.');
            if (this.selectedRoleId() === role.id) {
              this.selectedRoleId.set(null);
              this.permissionRows.set([]);
            }
            this.loadRoles();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Failed to delete role.')
        });
      });
  }

  savePermissions(): void {
    const roleId = this.selectedRoleId();
    if (!roleId) return;

    this.savingPermissions.set(true);
    const payload = this.permissionRows().map((r) => ({
      menuItemId: r.menuItemId,
      canView: r.canView,
      canAdd: r.canAdd,
      canEdit: r.canEdit,
      canDelete: r.canDelete
    }));

    this.roleService.setPermissions(roleId, payload).subscribe({
      next: () => {
        this.notify.success('Permissions saved.');
        this.savingPermissions.set(false);
      },
      error: () => {
        this.notify.error('Failed to save permissions.');
        this.savingPermissions.set(false);
      }
    });
  }
}
