import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';

interface ReturnableLineDto {
  salesInvoiceItemId: string;
  productVariantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  soldQuantity: number;
  alreadyReturned: number;
  netUnitPrice: number;
}

interface ReturnableInvoiceDto {
  salesInvoiceId: string;
  invoiceNumber: string;
  saleDate: string;
  customerId: string | null;
  customerName: string | null;
  lines: ReturnableLineDto[];
}

interface ReferencedLine extends ReturnableLineDto {
  returnNow: number;
  refundPrice: number;
}

interface UnreferencedLine {
  productVariantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  quantity: number;
  unitPrice: number;
}

interface CustomerDto {
  id: string;
  name: string;
}

interface SalesReturnListDto {
  id: string;
  returnNumber: string;
  returnDate: string;
  customerName: string | null;
  salesInvoiceNumber: string | null;
  refundedAmount: number;
  items: { isEstimatedCost: boolean }[];
}

@Component({
  selector: 'app-sales-return',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    NativeDatePickerDirective,
    VariantPickerComponent
  ],
  templateUrl: './sales-return.component.html',
  styleUrl: './sales-return.component.scss'
})
export class SalesReturnComponent implements OnInit {
  mode = signal<'referenced' | 'unreferenced'>('referenced');
  returnDate = new Date().toISOString().slice(0, 10);
  remarks = '';

  // Referenced (with receipt)
  invoiceNumber = '';
  loadingInvoice = signal(false);
  invoice = signal<ReturnableInvoiceDto | null>(null);
  referencedLines: ReferencedLine[] = [];

  // Unreferenced (no receipt)
  customers = signal<CustomerDto[]>([]);
  customerId: string | null = null;
  unreferencedLines: UnreferencedLine[] = [];

  history = signal<SalesReturnListDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);
  voiding = signal(false);

  constructor(
    private http: HttpClient,
    private notify: NotificationService,
    private confirm: ConfirmService
  ) {}

  ngOnInit(): void {
    this.http.get<CustomerDto[]>(`${environment.apiUrl}/customers`).subscribe((c) => this.customers.set(c));
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<SalesReturnListDto[]>(`${environment.apiUrl}/salesreturns`).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  // ------------------------------------------------------------- referenced

  loadInvoice(): void {
    const number = this.invoiceNumber.trim();
    if (!number) {
      this.notify.error('Enter an invoice number.');
      return;
    }
    this.loadingInvoice.set(true);
    this.http
      .get<ReturnableInvoiceDto>(`${environment.apiUrl}/salesreturns/returnable`, { params: { invoiceNumber: number } })
      .subscribe({
        next: (inv) => {
          this.invoice.set(inv);
          this.referencedLines = inv.lines.map((l) => ({ ...l, returnNow: 0, refundPrice: l.netUnitPrice }));
          this.loadingInvoice.set(false);
        },
        error: (err) => {
          this.invoice.set(null);
          this.referencedLines = [];
          this.notify.error(err?.error?.error ?? 'Failed to load the invoice.');
          this.loadingInvoice.set(false);
        }
      });
  }

  returnable(l: ReturnableLineDto): number {
    return l.soldQuantity - l.alreadyReturned;
  }

  get canVoid(): boolean {
    const inv = this.invoice();
    return !!inv && inv.lines.length > 0 && inv.lines.every((l) => l.alreadyReturned === 0);
  }

  submitReferenced(): void {
    const inv = this.invoice();
    if (!inv) {
      this.notify.error('Load an invoice first.');
      return;
    }
    const lines = this.referencedLines.filter((l) => l.returnNow > 0);
    if (lines.length === 0) {
      this.notify.error('Enter a return quantity for at least one line.');
      return;
    }
    for (const l of lines) {
      if (l.returnNow > this.returnable(l)) {
        this.notify.error(`Only ${this.returnable(l)} of ${l.productName} (${l.designNumber}) is still returnable.`);
        return;
      }
      if (l.refundPrice > l.netUnitPrice) {
        this.notify.error(`Refund price for ${l.productName} cannot exceed the original net price ${l.netUnitPrice}.`);
        return;
      }
    }

    this.post({
      returnNumber: null,
      returnDate: this.returnDate,
      customerId: null,
      salesInvoiceId: inv.salesInvoiceId,
      remarks: this.remarks || null,
      items: lines.map((l) => ({
        salesInvoiceItemId: l.salesInvoiceItemId,
        productVariantId: l.productVariantId,
        quantity: l.returnNow,
        unitPrice: l.refundPrice
      }))
    });
  }

  voidInvoice(): void {
    const inv = this.invoice();
    if (!inv || !this.canVoid) return;
    this.confirm
      .ask({
        title: 'Void Invoice',
        message: `Void invoice ${inv.invoiceNumber}? All ${inv.lines.length} line(s) will be returned to stock at their original cost and the refund posted. This cannot be undone.`,
        confirmLabel: 'Void Invoice',
        danger: true,
        icon: 'block'
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.voiding.set(true);
        this.http.post(`${environment.apiUrl}/salesinvoices/${inv.salesInvoiceId}/void`, {}).subscribe({
          next: () => {
            this.notify.success(`Invoice ${inv.invoiceNumber} voided; stock restored.`);
            this.voiding.set(false);
            this.resetReferenced();
            this.loadHistory();
          },
          error: (err) => {
            this.notify.error(err?.error?.error ?? 'Failed to void the invoice.');
            this.voiding.set(false);
          }
        });
      });
  }

  // ----------------------------------------------------------- unreferenced

  addVariant(v: VariantSearchResult): void {
    const existing = this.unreferencedLines.find((l) => l.productVariantId === v.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    this.unreferencedLines.push({
      productVariantId: v.id,
      barcode: v.barcode,
      productName: v.productName,
      designNumber: v.designNumber,
      quantity: 1,
      unitPrice: v.defaultSalePrice
    });
  }

  removeLine(index: number): void {
    this.unreferencedLines.splice(index, 1);
  }

  submitUnreferenced(): void {
    if (this.unreferencedLines.length === 0) {
      this.notify.error('Add at least one item.');
      return;
    }
    if (this.unreferencedLines.some((l) => l.quantity <= 0)) {
      this.notify.error('Quantity must be greater than zero for every line.');
      return;
    }
    if (this.unreferencedLines.some((l) => l.unitPrice < 0)) {
      this.notify.error('Refund price cannot be negative.');
      return;
    }

    this.post({
      returnNumber: null,
      returnDate: this.returnDate,
      customerId: this.customerId,
      salesInvoiceId: null,
      remarks: this.remarks || null,
      items: this.unreferencedLines.map((l) => ({
        salesInvoiceItemId: null,
        productVariantId: l.productVariantId,
        quantity: l.quantity,
        unitPrice: l.unitPrice
      }))
    });
  }

  get unreferencedTotal(): number {
    return this.unreferencedLines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  }

  get referencedTotal(): number {
    return this.referencedLines.reduce((sum, l) => sum + l.returnNow * l.refundPrice, 0);
  }

  // ----------------------------------------------------------------- shared

  private post(payload: unknown): void {
    this.saving.set(true);
    this.http.post<SalesReturnListDto>(`${environment.apiUrl}/salesreturns`, payload).subscribe({
      next: (r) => {
        this.notify.success(`Sales return ${r.returnNumber} posted; stock restored.`);
        this.saving.set(false);
        this.resetReferenced();
        this.unreferencedLines = [];
        this.customerId = null;
        this.remarks = '';
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to post the sales return.');
        this.saving.set(false);
      }
    });
  }

  private resetReferenced(): void {
    this.invoice.set(null);
    this.referencedLines = [];
    this.invoiceNumber = '';
  }
}
