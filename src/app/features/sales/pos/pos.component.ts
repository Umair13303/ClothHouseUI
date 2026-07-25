import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';
import { NotificationService } from '../../../core/services/notification.service';
import { DailySalesDialogComponent } from '../../../shared/components/daily-sales-dialog/daily-sales-dialog.component';
import { AuthService } from '../../../core/services/auth.service';

interface CustomerDto {
  id: string;
  name: string;
  phone: string | null;
  customerType: 'Cash' | 'Credit';
  outstandingBalance: number;
  creditLimit: number;
}

interface CartLine {
  variantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  availableStock: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type PaymentMethodValue = 'Cash' | 'DebitCard' | 'CreditCard' | 'BankTransfer' | 'Cheque' | 'JazzCash' | 'EasyPaisa' | 'Other';

interface PaymentLine {
  method: PaymentMethodValue;
  amount: number;
  referenceNumber: string;
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
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    VariantPickerComponent
  ],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit {
  customers = signal<CustomerDto[]>([]);
  customerId: string | null = null;
  customerSearchTerm = '';
  discount = 0;
  remarks = '';
  cart: CartLine[] = [];
  payments: PaymentLine[] = [{ method: 'Cash', amount: 0, referenceNumber: '' }];

  paymentMethods = PAYMENT_METHODS;

  saving = signal(false);
  lastReceipt = signal<any | null>(null);
  receiptPaperWidthMm = signal(80);
  storeName = signal('');
  storeAddress = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private notify: NotificationService,
    private dialog: MatDialog,
    private auth: AuthService
  ) {}

  get cashierName(): string {
    return this.auth.currentUser()?.fullName ?? '';
  }

  ngOnInit(): void {
    this.http.get<CustomerDto[]>(`${environment.apiUrl}/customers`).subscribe((c) => this.customers.set(c));
    this.http
      .get<{ name: string; address: string | null; receiptPaperWidthMm: number }>(`${environment.apiUrl}/settings/store`)
      .subscribe((s) => {
        this.receiptPaperWidthMm.set(s.receiptPaperWidthMm);
        this.storeName.set(s.name);
        this.storeAddress.set(s.address);
      });
  }

  get selectedCustomer(): CustomerDto | undefined {
    return this.customers().find((c) => c.id === this.customerId);
  }

  filteredCustomers(): CustomerDto[] {
    const term = this.customerSearchTerm.trim().toLowerCase();
    if (!term) return this.customers();
    return this.customers().filter(
      (c) => c.name.toLowerCase().includes(term) || (c.phone ?? '').toLowerCase().includes(term)
    );
  }

  customerLabel(c: CustomerDto): string {
    return c.phone ? `${c.name} · ${c.phone}` : c.name;
  }

  onCustomerSelected(customer: CustomerDto | null): void {
    this.customerId = customer?.id ?? null;
    this.customerSearchTerm = customer ? this.customerLabel(customer) : '';
  }

  openDailySales(): void {
    this.dialog.open(DailySalesDialogComponent, { width: '640px' });
  }

  addVariant(v: VariantSearchResult): void {
    const existing = this.cart.find((l) => l.variantId === v.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    this.cart.push({
      variantId: v.id,
      barcode: v.barcode,
      productName: v.productName,
      designNumber: v.designNumber,
      unitName: v.unitOfMeasureName,
      quantity: 1,
      unitPrice: v.defaultSalePrice,
      lineDiscount: 0,
      availableStock: v.currentStock
    });
  }

  removeLine(i: number): void {
    this.cart.splice(i, 1);
  }

  lineTotal(l: CartLine): number {
    return l.quantity * l.unitPrice - l.lineDiscount;
  }

  get subTotal(): number {
    return this.cart.reduce((sum, l) => sum + this.lineTotal(l), 0);
  }

  get grandTotal(): number {
    return this.subTotal - this.discount;
  }

  get amountPaid(): number {
    return this.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  get balanceDue(): number {
    return this.grandTotal - this.amountPaid;
  }

  addPaymentRow(): void {
    this.payments.push({ method: 'Cash', amount: 0, referenceNumber: '' });
  }

  removePaymentRow(i: number): void {
    this.payments.splice(i, 1);
  }

  autoFillPaid(): void {
    if (this.payments.length === 1) this.payments[0].amount = this.grandTotal;
  }

  submit(): void {
    if (this.cart.length === 0) {
      this.notify.error('Cart is empty.');
      return;
    }
    if (this.balanceDue > 0.009 && !this.customerId) {
      this.notify.error('A customer must be selected for credit sales (balance due > 0).');
      return;
    }

    this.saving.set(true);
    const payload = {
      invoiceNumber: null,
      saleDate: new Date().toISOString(),
      customerId: this.customerId,
      discount: this.discount,
      remarks: this.remarks || null,
      items: this.cart.map((l) => ({ productVariantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice, lineDiscount: l.lineDiscount })),
      payments: this.payments
        .filter((p) => p.amount > 0)
        .map((p) => ({ method: p.method, amount: p.amount, referenceNumber: p.referenceNumber || null }))
    };

    this.http.post(`${environment.apiUrl}/salesinvoices`, payload).subscribe({
      next: (invoice) => {
        this.lastReceipt.set(invoice);
        this.resetSale();
        this.saving.set(false);
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to complete sale.');
        this.saving.set(false);
      }
    });
  }

  printReceipt(): void {
    const widthMm = this.receiptPaperWidthMm();
    const styleId = 'thermal-page-size';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    // @page size doesn't support CSS custom properties, so the width has to be
    // written directly into the stylesheet text at print time.
    styleEl.textContent = `@page { size: ${widthMm}mm auto; margin: 0; }`;
    window.print();
  }

  newSale(): void {
    this.lastReceipt.set(null);
  }

  private resetSale(): void {
    this.customerId = null;
    this.customerSearchTerm = '';
    this.discount = 0;
    this.remarks = '';
    this.cart = [];
    this.payments = [{ method: 'Cash', amount: 0, referenceNumber: '' }];
  }
}
