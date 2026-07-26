import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';
import { NotificationService } from '../../../core/services/notification.service';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';

interface VendorDto {
  id: string;
  name: string;
}

interface PurchaseLine {
  variantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  quantity: number;
  purchasePrice: number;
  defaultSalePrice: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type InvoiceStatusValue = 'Draft' | 'Confirmed' | 'Cancelled';

interface PurchaseInvoiceListItem {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  vendorName: string;
  grandTotal: number;
  status: InvoiceStatusValue;
  items: { quantity: number; quantityReceived: number }[];
}

const STATUS_LABELS: Record<InvoiceStatusValue, string> = { Draft: 'Draft', Confirmed: 'Confirmed', Cancelled: 'Cancelled' };

@Component({
  selector: 'app-purchase-invoice',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    VariantPickerComponent,
    NativeDatePickerDirective
  ],
  templateUrl: './purchase-invoice.component.html',
  styleUrl: './purchase-invoice.component.scss'
})
export class PurchaseInvoiceComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/purchaseinvoices`;

  vendors = signal<VendorDto[]>([]);
  invoices = signal<PurchaseInvoiceListItem[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  vendorId: string | null = null;
  purchaseDate = new Date().toISOString().slice(0, 10);
  transportName = '';
  biltyNumber = '';
  freightCharges = 0;
  loadingCharges = 0;
  unloadingCharges = 0;
  otherCharges = 0;
  discount = 0;
  remarks = '';
  lines: PurchaseLine[] = [];

  constructor(private http: HttpClient, private notify: NotificationService) {}

  ngOnInit(): void {
    this.http.get<VendorDto[]>(`${environment.apiUrl}/vendors`).subscribe((v) => this.vendors.set(v));
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<PurchaseInvoiceListItem[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  addVariant(v: VariantSearchResult): void {
    const existing = this.lines.find((l) => l.variantId === v.id);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    this.lines.push({
      variantId: v.id,
      barcode: v.barcode,
      productName: v.productName,
      designNumber: v.designNumber,
      quantity: 1,
      purchasePrice: v.lastPurchasePrice || 0,
      defaultSalePrice: v.defaultSalePrice || 0
    });
  }

  removeLine(i: number): void {
    this.lines.splice(i, 1);
  }

  get subTotal(): number {
    return this.lines.reduce((sum, l) => sum + l.quantity * l.purchasePrice, 0);
  }

  get grandTotal(): number {
    return this.subTotal + this.freightCharges + this.loadingCharges + this.unloadingCharges + this.otherCharges - this.discount;
  }

  submit(): void {
    if (!this.vendorId) {
      this.notify.error('Select a vendor.');
      return;
    }
    if (this.lines.length === 0) {
      this.notify.error('Add at least one item.');
      return;
    }

    this.saving.set(true);
    const payload = {
      invoiceNumber: null,
      purchaseDate: this.purchaseDate,
      vendorId: this.vendorId,
      transportName: this.transportName || null,
      biltyNumber: this.biltyNumber || null,
      freightCharges: this.freightCharges,
      loadingCharges: this.loadingCharges,
      unloadingCharges: this.unloadingCharges,
      otherCharges: this.otherCharges,
      discount: this.discount,
      remarks: this.remarks || null,
      items: this.lines.map((l) => ({
        productVariantId: l.variantId,
        quantity: l.quantity,
        purchasePrice: l.purchasePrice,
        defaultSalePrice: l.defaultSalePrice
      }))
    };

    this.http.post(this.baseUrl, payload).subscribe({
      next: () => {
        this.notify.success('Purchase invoice created. Use Goods Receive to bring the stock in.');
        this.resetForm();
        this.saving.set(false);
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to create purchase invoice.');
        this.saving.set(false);
      }
    });
  }

  statusLabel(s: InvoiceStatusValue): string {
    return STATUS_LABELS[s] ?? '—';
  }

  receiveStatus(items: { quantity: number; quantityReceived: number }[]): string {
    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalRecv = items.reduce((s, i) => s + i.quantityReceived, 0);
    if (totalRecv === 0) return 'Pending';
    if (totalRecv < totalQty) return 'Partial';
    return 'Received';
  }

  private resetForm(): void {
    this.vendorId = null;
    this.transportName = '';
    this.biltyNumber = '';
    this.freightCharges = 0;
    this.loadingCharges = 0;
    this.unloadingCharges = 0;
    this.otherCharges = 0;
    this.discount = 0;
    this.remarks = '';
    this.lines = [];
  }
}
