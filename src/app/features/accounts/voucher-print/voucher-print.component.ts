import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type PaymentMethodValue = 'Cash' | 'DebitCard' | 'CreditCard' | 'BankTransfer' | 'Cheque' | 'JazzCash' | 'EasyPaisa' | 'Other';

interface ReceiptDto {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  customerName: string;
  amount: number;
  method: PaymentMethodValue;
  referenceNumber: string | null;
  remarks: string | null;
}

interface PaymentDto {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  vendorName: string;
  amount: number;
  method: PaymentMethodValue;
  referenceNumber: string | null;
  remarks: string | null;
}

interface StoreSettingsDto {
  name: string;
  address: string | null;
  receiptPaperWidthMm: number;
}

/** Both slips share one layout; only the labels and source endpoint differ. */
interface VoucherView {
  title: string;
  number: string;
  date: string;
  partyLabel: string;
  partyName: string;
  amount: number;
  method: PaymentMethodValue;
  referenceNumber: string | null;
  remarks: string | null;
  footer: string;
}

const METHOD_LABELS: Record<PaymentMethodValue, string> = {
  Cash: 'Cash',
  DebitCard: 'Debit Card',
  CreditCard: 'Credit Card',
  BankTransfer: 'Bank Transfer',
  Cheque: 'Cheque',
  JazzCash: 'JazzCash',
  EasyPaisa: 'EasyPaisa',
  Other: 'Other'
};

/**
 * Printable slip for money movements outside the POS sale flow: a receipt
 * given to a customer who pays down their balance, or a voucher kept for a
 * payment made to a vendor. Routed (not a dialog) for the same reason as
 * InvoicePrintComponent: the global @media print CSS already hides the shell
 * for any route.
 */
@Component({
  selector: 'app-voucher-print',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './voucher-print.component.html',
  styleUrl: './voucher-print.component.scss'
})
export class VoucherPrintComponent implements OnInit {
  voucher = signal<VoucherView | null>(null);
  loading = signal(true);
  notFound = signal(false);
  receiptPaperWidthMm = signal(80);
  storeName = signal('');
  storeAddress = signal<string | null>(null);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const kind = this.route.snapshot.data['kind'] as 'receipt' | 'payment';
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.http.get<StoreSettingsDto>(`${environment.apiUrl}/settings/store`).subscribe((s) => {
      this.receiptPaperWidthMm.set(s.receiptPaperWidthMm);
      this.storeName.set(s.name);
      this.storeAddress.set(s.address);
    });

    if (kind === 'receipt') {
      this.http.get<ReceiptDto>(`${environment.apiUrl}/receipts/${id}`).subscribe({
        next: (r) => this.show({
          title: 'PAYMENT RECEIPT',
          number: r.receiptNumber,
          date: r.receiptDate,
          partyLabel: 'Received from',
          partyName: r.customerName,
          amount: r.amount,
          method: r.method,
          referenceNumber: r.referenceNumber,
          remarks: r.remarks,
          footer: 'Thank you for your payment!'
        }),
        error: () => this.fail()
      });
    } else {
      this.http.get<PaymentDto>(`${environment.apiUrl}/payments/${id}`).subscribe({
        next: (p) => this.show({
          title: 'PAYMENT VOUCHER',
          number: p.paymentNumber,
          date: p.paymentDate,
          partyLabel: 'Paid to',
          partyName: p.vendorName,
          amount: p.amount,
          method: p.method,
          referenceNumber: p.referenceNumber,
          remarks: p.remarks,
          footer: 'Payment made against outstanding balance.'
        }),
        error: () => this.fail()
      });
    }
  }

  methodLabel(v: PaymentMethodValue): string {
    return METHOD_LABELS[v] ?? v;
  }

  print(): void {
    const widthMm = this.receiptPaperWidthMm();
    const styleId = 'thermal-page-size';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${widthMm}mm auto; margin: 0; }`;
    window.print();
  }

  close(): void {
    window.close();
  }

  private show(v: VoucherView): void {
    this.voucher.set(v);
    this.loading.set(false);
  }

  private fail(): void {
    this.notFound.set(true);
    this.loading.set(false);
  }
}
