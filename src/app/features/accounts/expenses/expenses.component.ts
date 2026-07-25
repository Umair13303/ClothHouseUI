import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

interface ExpenseCategoryDto {
  id: string;
  name: string;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type PaymentMethodValue = 'Cash' | 'DebitCard' | 'CreditCard' | 'BankTransfer' | 'Cheque' | 'JazzCash' | 'EasyPaisa' | 'Other';

interface ExpenseDto {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  expenseCategoryName: string;
  amount: number;
  method: PaymentMethodValue;
  remarks: string | null;
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
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/expenses`;

  categories = signal<ExpenseCategoryDto[]>([]);
  expenses = signal<ExpenseDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  paymentMethods = PAYMENT_METHODS;

  categoryId: string | null = null;
  expenseDate = new Date().toISOString().slice(0, 10);
  amount: number | null = null;
  method: PaymentMethodValue = 'Cash';
  remarks = '';

  constructor(private http: HttpClient, private notify: NotificationService) {}

  ngOnInit(): void {
    this.http.get<ExpenseCategoryDto[]>(`${environment.apiUrl}/expensecategories`).subscribe((c) => this.categories.set(c));
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<ExpenseDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.expenses.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  submit(): void {
    if (!this.categoryId || !this.amount || this.amount <= 0) {
      this.notify.error('Select a category and enter a positive amount.');
      return;
    }

    this.saving.set(true);
    const payload = {
      expenseNumber: null,
      expenseDate: this.expenseDate,
      expenseCategoryId: this.categoryId,
      amount: this.amount,
      method: this.method,
      remarks: this.remarks || null
    };

    this.http.post(this.baseUrl, payload).subscribe({
      next: () => {
        this.notify.success('Expense recorded successfully.');
        this.resetForm();
        this.saving.set(false);
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to record expense.');
        this.saving.set(false);
      }
    });
  }

  methodLabel(v: PaymentMethodValue): string {
    return this.paymentMethods.find((m) => m.value === v)?.label ?? '—';
  }

  private resetForm(): void {
    this.categoryId = null;
    this.amount = null;
    this.method = 'Cash';
    this.remarks = '';
  }
}
