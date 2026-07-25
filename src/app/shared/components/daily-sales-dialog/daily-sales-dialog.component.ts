import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../environments/environment';

interface DailySalesInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string | null;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
}

const PAGE_SIZE = 8;

/**
 * "Today's Sales" summary opened from the POS screen. Fetches invoices for
 * the current calendar day — toDate is passed as the start of *tomorrow*
 * (exclusive) since the API's date filters compare against a bare date
 * (midnight), which would otherwise silently exclude everything from later
 * today.
 */
@Component({
  selector: 'app-daily-sales-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="dialog-header">
      <span class="icon-badge"><mat-icon>point_of_sale</mat-icon></span>
      <h2 mat-dialog-title>Today's Sales</h2>
    </div>
    <mat-dialog-content>
      @if (loading) {
        <p>Loading…</p>
      } @else if (invoices.length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <p>No sales recorded today yet.</p>
        </div>
      } @else {
        <table>
          <thead>
            <tr><th>Invoice #</th><th>Customer</th><th>Total</th><th>Paid</th><th>Balance</th><th></th></tr>
          </thead>
          <tbody>
            @for (inv of pagedInvoices; track inv.id) {
              <tr>
                <td class="mono">{{ inv.invoiceNumber }}</td>
                <td>{{ inv.customerName ?? 'Walk-in' }}</td>
                <td>{{ inv.grandTotal | number: '1.0-2' }}</td>
                <td>{{ inv.amountPaid | number: '1.0-2' }}</td>
                <td [class.balance-due]="inv.balanceDue > 0">{{ inv.balanceDue | number: '1.0-2' }}</td>
                <td>
                  <button mat-icon-button matTooltip="Print invoice" (click)="printInvoice(inv)">
                    <mat-icon>print</mat-icon>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (totalPages > 1) {
          <div class="pagination-row">
            <button mat-icon-button [disabled]="page === 1" (click)="prevPage()">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <span>Page {{ page }} of {{ totalPages }}</span>
            <button mat-icon-button [disabled]="page === totalPages" (click)="nextPage()">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        }
        <div class="summary-row">
          <div><span>Invoices</span><strong>{{ invoices.length }}</strong></div>
          <div><span>Gross Total</span><strong>{{ grossTotal | number: '1.0-2' }}</strong></div>
          <div><span>Collected</span><strong>{{ totalPaid | number: '1.0-2' }}</strong></div>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" [mat-dialog-close]="null">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 24px;
    }

    .icon-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-primary-tint);
      color: var(--color-primary);
      flex-shrink: 0;
    }

    h2[mat-dialog-title] {
      margin: 0;
    }

    mat-dialog-content {
      min-width: 460px;
      padding-top: 4px;
      /* Reserve the scrollbar's width up front so the table doesn't reflow
         (and its columns shift) when content grows past the dialog's max
         height and a scrollbar appears. */
      scrollbar-gutter: stable;
    }

    table {
      width: 100%;
      table-layout: fixed;
    }

    th:nth-child(1), td:nth-child(1) { width: 22%; }
    th:nth-child(2), td:nth-child(2) { width: 20%; }
    th:nth-child(3), td:nth-child(3) { width: 15%; }
    th:nth-child(4), td:nth-child(4) { width: 15%; }
    th:nth-child(5), td:nth-child(5) { width: 16%; }
    th:nth-child(6), td:nth-child(6) { width: 12%; text-align: center; }

    td {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mono {
      font-family: 'Consolas', monospace;
      font-size: 13px;
    }

    .balance-due {
      color: var(--color-danger);
      font-weight: 600;
    }

    .empty-state {
      color: var(--color-text-muted);
      text-align: center;
      padding: 32px 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;

      mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        color: var(--color-border);
      }

      p {
        margin: 0;
      }
    }

    .pagination-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 8px;
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid var(--color-border);

      div {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 13px;
        color: var(--color-text-muted);
      }

      strong {
        font-size: 16px;
        color: var(--color-text);
      }
    }
  `]
})
export class DailySalesDialogComponent implements OnInit {
  invoices: DailySalesInvoice[] = [];
  loading = true;
  grossTotal = 0;
  totalPaid = 0;
  page = 1;

  constructor(private http: HttpClient, private router: Router) {}

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.invoices.length / PAGE_SIZE));
  }

  get pagedInvoices(): DailySalesInvoice[] {
    const start = (this.page - 1) * PAGE_SIZE;
    return this.invoices.slice(start, start + PAGE_SIZE);
  }

  prevPage(): void {
    if (this.page > 1) this.page--;
  }

  nextPage(): void {
    if (this.page < this.totalPages) this.page++;
  }

  printInvoice(inv: DailySalesInvoice): void {
    const url = this.router.serializeUrl(this.router.createUrlTree(['/sales/invoice-print', inv.id]));
    window.open(url, '_blank');
  }

  ngOnInit(): void {
    const today = new Date();
    const fromDate = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const toDate = tomorrow.toISOString().slice(0, 10);

    this.http.get<DailySalesInvoice[]>(`${environment.apiUrl}/salesinvoices`, { params: { fromDate, toDate } }).subscribe({
      next: (data) => {
        this.invoices = data;
        this.grossTotal = data.reduce((sum, i) => sum + i.grandTotal, 0);
        this.totalPaid = data.reduce((sum, i) => sum + i.amountPaid, 0);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
