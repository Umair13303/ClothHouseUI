import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';
import { NotificationService } from '../../../core/services/notification.service';
import { CancelPromptService } from '../../../core/services/cancel-prompt.service';

interface VendorDto {
  id: string;
  name: string;
  outstandingBalance: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type PaymentMethodValue = 'Cash' | 'DebitCard' | 'CreditCard' | 'BankTransfer' | 'Cheque' | 'JazzCash' | 'EasyPaisa' | 'Other';
type MoneyDocumentStatusValue = 'Confirmed' | 'Cancelled';

interface PaymentDto {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  vendorName: string;
  amount: number;
  method: PaymentMethodValue;
  referenceNumber: string | null;
  remarks: string | null;
  status: MoneyDocumentStatusValue;
}

const PAYMENT_METHODS: { value: PaymentMethodValue; label: string }[] = [
  { value: 'Cash', label: 'Cash' },
  { value: 'DebitCard', label: 'Debit Card' },
  { value: 'CreditCard', label: 'Credit Card' },
  { value: 'BankTransfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'JazzCash', label: 'JazzCash' },
  { value: 'EasyPaisa', label: 'EasyPaisa' },
  { value: 'Other', label: 'Other' }
];

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, NativeDatePickerDirective],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/payments`;

  vendors = signal<VendorDto[]>([]);
  payments = signal<PaymentDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  paymentMethods = PAYMENT_METHODS;

  vendorId: string | null = null;
  paymentDate = new Date().toISOString().slice(0, 10);
  amount: number | null = null;
  method: PaymentMethodValue = 'Cash';
  referenceNumber = '';
  remarks = '';

  constructor(private http: HttpClient, private notify: NotificationService, private cancelPrompt: CancelPromptService) {}

  ngOnInit(): void {
    this.http.get<VendorDto[]>(`${environment.apiUrl}/vendors`).subscribe((v) => this.vendors.set(v));
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<PaymentDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.payments.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  get selectedVendor(): VendorDto | undefined {
    return this.vendors().find((v) => v.id === this.vendorId);
  }

  submit(): void {
    if (!this.vendorId || !this.amount || this.amount <= 0) {
      this.notify.error('Select a vendor and enter a positive amount.');
      return;
    }

    this.saving.set(true);
    const payload = {
      paymentNumber: null,
      paymentDate: this.paymentDate,
      vendorId: this.vendorId,
      amount: this.amount,
      method: this.method,
      referenceNumber: this.referenceNumber || null,
      remarks: this.remarks || null
    };

    this.http.post<PaymentDto>(this.baseUrl, payload).subscribe({
      next: (created) => {
        this.notify.success('Payment recorded successfully.');
        this.resetForm();
        this.saving.set(false);
        this.loadHistory();
        this.printSlip(created.id);
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to record payment.');
        this.saving.set(false);
      }
    });
  }

  methodLabel(v: PaymentMethodValue): string {
    return this.paymentMethods.find((m) => m.value === v)?.label ?? '—';
  }

  /** New tab so the form/history stays where the user left it. */
  printSlip(id: string): void {
    window.open(`/accounts/payments/print/${id}`, '_blank');
  }

  cancel(p: PaymentDto): void {
    this.cancelPrompt
      .ask({ title: 'Cancel this payment?', message: `Payment ${p.paymentNumber} to ${p.vendorName}, ${p.amount}. This restores the vendor's balance and cannot be undone.` })
      .subscribe((reason) => {
        if (!reason) return;
        this.http.post(`${this.baseUrl}/${p.id}/cancel`, { reason }).subscribe({
          next: () => {
            this.notify.success('Payment cancelled.');
            this.loadHistory();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Failed to cancel payment.')
        });
      });
  }

  private resetForm(): void {
    this.vendorId = null;
    this.amount = null;
    this.method = 'Cash';
    this.referenceNumber = '';
    this.remarks = '';
  }
}
