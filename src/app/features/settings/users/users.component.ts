import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ConfirmService } from '../../../core/services/confirm.service';
import { AdminUser, CreateUserRequest } from '../../../core/models/user.model';
import { Role } from '../../../core/models/role.model';
import { NotificationService } from '../../../core/services/notification.service';
import { RoleService } from '../../../core/services/role.service';
import { UserService } from '../../../core/services/user.service';

type UserForm = { userName: string; email: string; fullName: string; password: string; role: string };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users = signal<AdminUser[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(false);
  saving = signal(false);
  showForm = false;
  errorMessage = signal<string | null>(null);

  formModel: UserForm = this.emptyForm();

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private confirmDialog: ConfirmService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.load();
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.notify.error('Failed to load roles.')
    });
  }

  load(): void {
    this.loading.set(true);
    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load users.');
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.errorMessage.set(null);
    this.formModel = this.emptyForm();
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  save(): void {
    this.errorMessage.set(null);
    this.saving.set(true);

    const request: CreateUserRequest = { ...this.formModel };
    this.userService.createUser(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.showForm = false;
        this.notify.success('User created.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.error ?? 'Failed to create user.');
      }
    });
  }

  toggleActive(user: AdminUser): void {
    if (!user.isActive) {
      this.setActive(user, true);
      return;
    }

    this.confirmDialog
      .ask({
        title: 'Deactivate user?',
        message: `Deactivate "${user.fullName}"? They won't be able to sign in until reactivated.`,
        confirmLabel: 'Deactivate',
        danger: true
      })
      .subscribe((confirmed) => {
        if (confirmed) this.setActive(user, false);
      });
  }

  private setActive(user: AdminUser, isActive: boolean): void {
    this.userService.setActive(user.id, isActive).subscribe({
      next: () => {
        this.notify.success(isActive ? 'User activated.' : 'User deactivated.');
        this.load();
      },
      error: () => this.notify.error('Failed to update user.')
    });
  }

  private emptyForm(): UserForm {
    return { userName: '', email: '', fullName: '', password: '', role: this.roles()[0]?.name ?? '' };
  }
}
