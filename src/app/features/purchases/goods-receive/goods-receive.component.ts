import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';

interface PurchaseInvoiceItem {
  id: string;
  productVariantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  quantity: number;
  quantityReceived: number;
}

interface PurchaseInvoiceDto {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  purchaseDate: string;
  items: PurchaseInvoiceItem[];
}

interface ReceiveLine extends PurchaseInvoiceItem {
  receiveNow: number;
}

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type GoodsReceiveStatusValue = 'Pending' | 'PartiallyReceived' | 'Received' | 'Cancelled';

interface GoodsReceiveListDto {
  id: string;
  receiveNumber: string;
  receiveDate: string;
  purchaseInvoiceNumber: string;
  status: GoodsReceiveStatusValue;
  items: { quantityReceived: number }[];
}

@Component({
  selector: 'app-goods-receive',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './goods-receive.component.html',
  styleUrl: './goods-receive.component.scss'
})
export class GoodsReceiveComponent implements OnInit {
  /** Optional query param from the Purchase Invoice screen's "Receive" link. */
  @Input() invoiceId: string | null = null;

  pendingInvoices = signal<PurchaseInvoiceDto[]>([]);
  selectedInvoice = signal<PurchaseInvoiceDto | null>(null);
  receiveLines: ReceiveLine[] = [];
  receiveDate = new Date().toISOString().slice(0, 10);
  remarks = '';

  history = signal<GoodsReceiveListDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  constructor(private http: HttpClient, private notify: NotificationService) {}

  ngOnInit(): void {
    this.loadPendingInvoices();
    this.loadHistory();
  }

  loadPendingInvoices(): void {
    this.http.get<PurchaseInvoiceDto[]>(`${environment.apiUrl}/purchaseinvoices`).subscribe((invoices) => {
      const pending = invoices.filter((inv) => inv.items.some((i) => i.quantityReceived < i.quantity));
      this.pendingInvoices.set(pending);
      if (this.invoiceId) {
        const match = pending.find((i) => i.id === this.invoiceId);
        if (match) this.selectInvoice(match);
      }
    });
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<GoodsReceiveListDto[]>(`${environment.apiUrl}/goodsreceive`).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  onInvoiceChange(id: string): void {
    const invoice = this.pendingInvoices().find((i) => i.id === id) ?? null;
    this.selectInvoice(invoice);
  }

  selectInvoice(invoice: PurchaseInvoiceDto | null): void {
    this.selectedInvoice.set(invoice);
    this.receiveLines = invoice
      ? invoice.items
          .filter((i) => i.quantityReceived < i.quantity)
          .map((i) => ({ ...i, receiveNow: i.quantity - i.quantityReceived }))
      : [];
  }

  submit(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) {
      this.notify.error('Select a purchase invoice.');
      return;
    }
    const items = this.receiveLines.filter((l) => l.receiveNow > 0);
    if (items.length === 0) {
      this.notify.error('Enter a quantity to receive for at least one item.');
      return;
    }

    this.saving.set(true);
    const payload = {
      receiveNumber: null,
      receiveDate: this.receiveDate,
      purchaseInvoiceId: invoice.id,
      remarks: this.remarks || null,
      items: items.map((l) => ({ purchaseInvoiceItemId: l.id, quantityReceived: l.receiveNow }))
    };

    this.http.post(`${environment.apiUrl}/goodsreceive`, payload).subscribe({
      next: () => {
        this.notify.success('Goods received and stock updated.');
        this.selectedInvoice.set(null);
        this.receiveLines = [];
        this.remarks = '';
        this.saving.set(false);
        this.loadPendingInvoices();
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to post goods receive.');
        this.saving.set(false);
      }
    });
  }

  statusLabel(s: GoodsReceiveStatusValue): string {
    const labels: Record<GoodsReceiveStatusValue, string> = {
      Pending: 'Pending',
      PartiallyReceived: 'Partially Received',
      Received: 'Received',
      Cancelled: 'Cancelled'
    };
    return labels[s] ?? '—';
  }
}
