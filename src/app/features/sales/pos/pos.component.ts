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
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
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
  colorName: string | null;
  colorHexCode: string | null;
  unitName: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  availableStock: number;
  productId: string;
  brandId: string | null;
  categoryId: string;
  /** Set while an auto-applied sale offer drives lineDiscount; cleared when the cashier edits the discount by hand. */
  offerName: string | null;
  offerPercent: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type OfferScopeValue = 'All' | 'Brand' | 'Category' | 'Product';

interface SaleOfferDto {
  id: string;
  name: string;
  discountPercent: number;
  scope: OfferScopeValue;
  brandId: string | null;
  categoryId: string | null;
  productId: string | null;
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

  activeOffers = signal<SaleOfferDto[]>([]);

  ngOnInit(): void {
    this.http.get<CustomerDto[]>(`${environment.apiUrl}/customers`).subscribe((c) => this.customers.set(c));
    this.http.get<SaleOfferDto[]>(`${environment.apiUrl}/saleoffers/active`).subscribe((o) => this.activeOffers.set(o));
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
    if (v.currentStock <= 0) {
      this.dialog.open(ConfirmDialogComponent, {
        width: '400px',
        data: {
          title: 'Out of Stock',
          message: `"${v.productName} — ${v.designNumber}${v.colorName ? ' (' + v.colorName + ')' : ''}" has 0 stock and cannot be sold. Receive stock first (Purchases → Goods Receive) or adjust stock.`,
          alertOnly: true,
          danger: true,
          icon: 'production_quantity_limits'
        }
      });
      return;
    }
    const existing = this.cart.find((l) => l.variantId === v.id);
    if (existing) {
      existing.quantity += 1;
      this.reapplyOffer(existing);
      return;
    }
    const line: CartLine = {
      variantId: v.id,
      barcode: v.barcode,
      productName: v.productName,
      designNumber: v.designNumber,
      colorName: v.colorName,
      colorHexCode: v.colorHexCode,
      unitName: v.unitOfMeasureName,
      quantity: 1,
      unitPrice: v.defaultSalePrice,
      lineDiscount: 0,
      availableStock: v.currentStock,
      productId: v.productId,
      brandId: v.brandId,
      categoryId: v.categoryId,
      offerName: null,
      offerPercent: 0
    };
    this.applyBestOffer(line);
    this.cart.push(line);
  }

  /** Highest-percentage running offer whose scope covers this line, if any. */
  private bestOfferFor(l: CartLine): SaleOfferDto | undefined {
    return this.activeOffers()
      .filter((o) =>
        o.scope === 'All' ||
        (o.scope === 'Product' && o.productId === l.productId) ||
        (o.scope === 'Brand' && o.brandId === l.brandId) ||
        (o.scope === 'Category' && o.categoryId === l.categoryId))
      .sort((a, b) => b.discountPercent - a.discountPercent)[0];
  }

  private applyBestOffer(l: CartLine): void {
    const offer = this.bestOfferFor(l);
    if (!offer) return;
    l.offerName = offer.name;
    l.offerPercent = offer.discountPercent;
    l.lineDiscount = this.offerDiscountAmount(l);
  }

  private offerDiscountAmount(l: CartLine): number {
    return Math.round(l.quantity * l.unitPrice * l.offerPercent) / 100;
  }

  /** Keeps an auto-applied offer's amount in sync when qty/price change. */
  reapplyOffer(l: CartLine): void {
    if (l.offerName) l.lineDiscount = this.offerDiscountAmount(l);
  }

  /** A hand-typed discount takes over from the offer for that line. */
  onManualDiscount(l: CartLine): void {
    l.offerName = null;
    l.offerPercent = 0;
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
