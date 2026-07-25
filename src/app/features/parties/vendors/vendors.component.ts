import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MenuService } from '../../../core/services/menu.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LedgerDialogComponent } from '../../../shared/components/ledger-dialog/ledger-dialog.component';

interface VendorDto {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  ntn: string | null;
  outstandingBalance: number;
  isActive: boolean;
}

type VendorForm = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  ntn: string;
  isActive: boolean;
};

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatCheckboxModule],
  templateUrl: './vendors.component.html',
  styleUrl: './vendors.component.scss'
})
export class VendorsComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/vendors`;

  vendors = signal<VendorDto[]>([]);
  loading = signal(false);
  showForm = false;
  editingId: string | null = null;

  formModel: VendorForm = this.emptyForm();

  constructor(
    private http: HttpClient,
    private confirmDialog: ConfirmService,
    private notify: NotificationService,
    private dialog: MatDialog,
    public menuService: MenuService
  ) {}

  openLedger(v: VendorDto): void {
    this.dialog.open(LedgerDialogComponent, { width: '720px', data: { type: 'vendor', id: v.id } });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<VendorDto[]>(`${this.baseUrl}?includeInactive=true`).subscribe({
      next: (data) => {
        this.vendors.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load vendors.');
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formModel = this.emptyForm();
    this.showForm = true;
  }

  startEdit(v: VendorDto): void {
    this.editingId = v.id;
    this.formModel = {
      name: v.name,
      contactPerson: v.contactPerson ?? '',
      phone: v.phone ?? '',
      email: v.email ?? '',
      address: v.address ?? '',
      ntn: v.ntn ?? '',
      isActive: v.isActive
    };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  save(): void {
    const request$ = this.editingId
      ? this.http.put(`${this.baseUrl}/${this.editingId}`, this.formModel)
      : this.http.post(this.baseUrl, this.formModel);

    request$.subscribe({
      next: () => {
        this.showForm = false;
        this.notify.success(this.editingId ? 'Vendor updated.' : 'Vendor created.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Save failed.')
    });
  }

  remove(v: VendorDto): void {
    this.confirmDialog
      .ask({ title: 'Delete vendor?', message: `Delete vendor "${v.name}"?`, confirmLabel: 'Delete', danger: true })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.http.delete(`${this.baseUrl}/${v.id}`).subscribe({
          next: () => {
            this.notify.success('Vendor deleted.');
            this.load();
          },
          error: () => this.notify.error('Delete failed.')
        });
      });
  }

  private emptyForm(): VendorForm {
    return { name: '', contactPerson: '', phone: '', email: '', address: '', ntn: '', isActive: true };
  }
}
