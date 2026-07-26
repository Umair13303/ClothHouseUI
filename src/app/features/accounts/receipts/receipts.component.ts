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

interface CustomerDto {
  id: string;
  name: string;
  outstandingBalance: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type PaymentMethodValue = 'Cash' | 'DebitCard' | 'CreditCard' | 'BankTransfer' | 'Cheque' | 'JazzCash' | 'EasyPaisa' | 'Other';
type MoneyDocumentStatusValue = 'Confirmed' | 'Cancelled';

interface ReceiptDto {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  customerName: string;
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
  selector: 'app-receipts',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, NativeDatePickerDirective],
  templateUrl: './receipts.component.html',
  styleUrl: './receipts.component.scss'
})
export class ReceiptsComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/receipts`;

  customers = signal<CustomerDto[]>([]);
  receipts = signal<ReceiptDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  paymentMethods = PAYMENT_METHODS;

  customerId: string | null = null;
  receiptDate = new Date().toISOString().slice(0, 10);
  amount: number | null = null;
  method: PaymentMethodValue = 'Cash';
  referenceNumber = '';
  remarks = '';

  constructor(private http: HttpClient, private notify: NotificationService, private cancelPrompt: CancelPromptService) {}

  ngOnInit(): void {
    this.http.get<CustomerDto[]>(`${environment.apiUrl}/customers`).subscribe((c) => this.customers.set(c));
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<ReceiptDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.receipts.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  get selectedCustomer(): CustomerDto | undefined {
    return this.customers().find((c) => c.id === this.customerId);
  }

  submit(): void {
    if (!this.customerId || !this.amount || this.amount <= 0) {
      this.notify.error('Select a customer and enter a positive amount.');
      return;
    }

    this.saving.set(true);
    const payload = {
      receiptNumber: null,
      receiptDate: this.receiptDate,
      customerId: this.customerId,
      amount: this.amount,
      method: this.method,
      referenceNumber: this.referenceNumber || null,
      remarks: this.remarks || null
    };

    this.http.post<ReceiptDto>(this.baseUrl, payload).subscribe({
      next: (created) => {
        this.notify.success('Receipt recorded successfully.');
        this.resetForm();
        this.saving.set(false);
        this.loadHistory();
        this.printSlip(created.id);
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to record receipt.');
        this.saving.set(false);
      }
    });
  }

  methodLabel(v: PaymentMethodValue): string {
    return this.paymentMethods.find((m) => m.value === v)?.label ?? '—';
  }

  /** New tab so the form/history stays where the cashier left it. */
  printSlip(id: string): void {
    window.open(`/accounts/receipts/print/${id}`, '_blank');
  }

  cancel(r: ReceiptDto): void {
    this.cancelPrompt
      .ask({ title: 'Cancel this receipt?', message: `Receipt ${r.receiptNumber} for ${r.customerName}, ${r.amount}. This restores the customer's balance and cannot be undone.` })
      .subscribe((reason) => {
        if (!reason) return;
        this.http.post(`${this.baseUrl}/${r.id}/cancel`, { reason }).subscribe({
          next: () => {
            this.notify.success('Receipt cancelled.');
            this.loadHistory();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Failed to cancel receipt.')
        });
      });
  }

  private resetForm(): void {
    this.customerId = null;
    this.amount = null;
    this.method = 'Cash';
    this.referenceNumber = '';
    this.remarks = '';
  }
}
