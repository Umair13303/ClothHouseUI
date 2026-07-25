import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

interface SalesInvoiceItemDto {
  id: string;
  productName: string;
  designNumber: string;
  quantity: number;
  unitOfMeasureCode: string;
  unitPrice: number;
  lineTotal: number;
}

interface SalesInvoiceDto {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  customerName: string | null;
  discount: number;
  subTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  items: SalesInvoiceItemDto[];
}

interface StoreSettingsDto {
  name: string;
  address: string | null;
  receiptPaperWidthMm: number;
}

/**
 * Reprint view for a past sale — reachable from the Today's Sales dialog
 * (opened in a new tab so the dialog stays open). Kept as a normal routed
 * page rather than a MatDialog so it inherits the app's existing print
 * setup: global `@media print` in styles.scss already hides the sidenav
 * and toolbar for any route, same as the POS receipt and barcode-print
 * pages.
 */
@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './invoice-print.component.html',
  styleUrl: './invoice-print.component.scss'
})
export class InvoicePrintComponent implements OnInit {
  invoice = signal<SalesInvoiceDto | null>(null);
  loading = signal(true);
  notFound = signal(false);
  receiptPaperWidthMm = signal(80);
  storeName = signal('');
  storeAddress = signal<string | null>(null);

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
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

    this.http.get<SalesInvoiceDto>(`${environment.apiUrl}/salesinvoices/${id}`).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      }
    });
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
}
