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
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { MenuService } from '../../../core/services/menu.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LedgerDialogComponent } from '../../../shared/components/ledger-dialog/ledger-dialog.component';

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type CustomerTypeValue = 'Cash' | 'Credit';

interface CustomerDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnic: string | null;
  customerType: CustomerTypeValue;
  creditLimit: number;
  outstandingBalance: number;
  isActive: boolean;
}

type CustomerForm = {
  name: string;
  phone: string;
  email: string;
  address: string;
  cnic: string;
  customerType: CustomerTypeValue;
  creditLimit: number;
  isActive: boolean;
  /** Create-only (ADR-003 B4): posted as one OpeningBalance adjustment. Ignored on edit. */
  openingBalance: number;
};

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss'
})
export class CustomersComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/customers`;

  customers = signal<CustomerDto[]>([]);
  loading = signal(false);
  showForm = false;
  editingId: string | null = null;

  formModel: CustomerForm = this.emptyForm();

  constructor(
    private http: HttpClient,
    private confirmDialog: ConfirmService,
    private notify: NotificationService,
    private dialog: MatDialog,
    public menuService: MenuService
  ) {}

  openLedger(c: CustomerDto): void {
    this.dialog.open(LedgerDialogComponent, {
      width: '95vw',
      maxWidth: '1100px',
      data: { type: 'customer', id: c.id }
    });
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<CustomerDto[]>(`${this.baseUrl}?includeInactive=true`).subscribe({
      next: (data) => {
        this.customers.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load customers.');
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formModel = this.emptyForm();
    this.showForm = true;
  }

  startEdit(c: CustomerDto): void {
    this.editingId = c.id;
    this.formModel = {
      name: c.name,
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      cnic: c.cnic ?? '',
      customerType: c.customerType,
      creditLimit: c.creditLimit,
      isActive: c.isActive,
      openingBalance: 0
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
        this.notify.success(this.editingId ? 'Customer updated.' : 'Customer created.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Save failed.')
    });
  }

  remove(c: CustomerDto): void {
    this.confirmDialog
      .ask({ title: 'Delete customer?', message: `Delete customer "${c.name}"?`, confirmLabel: 'Delete', danger: true })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.http.delete(`${this.baseUrl}/${c.id}`).subscribe({
          next: () => {
            this.notify.success('Customer deleted.');
            this.load();
          },
          error: () => this.notify.error('Delete failed.')
        });
      });
  }

  typeLabel(t: CustomerTypeValue): string {
    return t;
  }

  private emptyForm(): CustomerForm {
    return { name: '', phone: '', email: '', address: '', cnic: '', customerType: 'Credit', creditLimit: 0, isActive: true, openingBalance: 0 };
  }
}
