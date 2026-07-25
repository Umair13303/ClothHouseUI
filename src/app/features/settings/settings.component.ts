import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MenuService } from '../../core/services/menu.service';

interface StoreSettingsDto {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  receiptPaperWidthMm: number;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  store = signal<StoreSettingsDto | null>(null);
  storeForm = { name: '', address: '', phone: '', receiptPaperWidthMm: 80 };
  storeSaving = signal(false);
  storeMessage = signal<string | null>(null);
  storeError = signal<string | null>(null);

  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
  passwordSaving = signal(false);
  passwordMessage = signal<string | null>(null);
  passwordError = signal<string | null>(null);

  constructor(private http: HttpClient, public menuService: MenuService) {}

  ngOnInit(): void {
    this.http.get<StoreSettingsDto>(`${environment.apiUrl}/settings/store`).subscribe((s) => {
      this.store.set(s);
      this.storeForm = { name: s.name, address: s.address ?? '', phone: s.phone ?? '', receiptPaperWidthMm: s.receiptPaperWidthMm };
    });
  }

  saveStore(): void {
    this.storeError.set(null);
    this.storeMessage.set(null);
    this.storeSaving.set(true);
    this.http.put<StoreSettingsDto>(`${environment.apiUrl}/settings/store`, this.storeForm).subscribe({
      next: (s) => {
        this.store.set(s);
        this.storeMessage.set('Store details updated.');
        this.storeSaving.set(false);
      },
      error: (err) => {
        this.storeError.set(err?.error?.error ?? 'Failed to update store details.');
        this.storeSaving.set(false);
      }
    });
  }

  changePassword(): void {
    this.passwordError.set(null);
    this.passwordMessage.set(null);

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError.set('New password and confirmation do not match.');
      return;
    }
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword) {
      this.passwordError.set('Fill in all password fields.');
      return;
    }

    this.passwordSaving.set(true);
    this.http
      .post(`${environment.apiUrl}/auth/change-password`, {
        currentPassword: this.passwordForm.currentPassword,
        newPassword: this.passwordForm.newPassword
      })
      .subscribe({
        next: () => {
          this.passwordMessage.set('Password changed successfully.');
          this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
          this.passwordSaving.set(false);
        },
        error: (err) => {
          this.passwordError.set(err?.error?.error ?? 'Failed to change password.');
          this.passwordSaving.set(false);
        }
      });
  }
}
