import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { NativeDatePickerDirective } from '../../../shared/directives/native-date-picker.directive';

interface MethodAmountDto {
  method: string;
  amount: number;
}

interface DayClosingRowDto {
  userName: string;
  invoiceCount: number;
  grossSales: number;
  invoiceDiscount: number;
  netSales: number;
  salePaymentsCollected: number;
  creditSales: number;
  receiptsCollected: number;
  totalCollected: number;
  cashCollected: number;
  methodBreakdown: MethodAmountDto[];
}

interface DayClosingDto {
  date: string;
  users: DayClosingRowDto[];
  totals: DayClosingRowDto;
}

/**
 * End-of-day closing sheet, one row per user (cashier): what they sold,
 * what they collected by method, and how much credit they extended.
 * Printable so the sheet can be signed and filed with the day's cash.
 */
@Component({
  selector: 'app-day-closing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, NativeDatePickerDirective],
  templateUrl: './day-closing.component.html',
  styleUrl: './day-closing.component.scss'
})
export class DayClosingComponent implements OnInit {
  date = new Date().toISOString().slice(0, 10);
  now = new Date();
  report = signal<DayClosingDto | null>(null);
  loading = signal(false);

  constructor(private http: HttpClient, private auth: AuthService) {}

  get preparedBy(): string {
    return this.auth.currentUser()?.fullName ?? '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.http.get<DayClosingDto>(`${environment.apiUrl}/reports/day-closing`, { params: { date: this.date } }).subscribe({
      next: (r) => {
        this.report.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  breakdown(row: DayClosingRowDto): string {
    return row.methodBreakdown.map((m) => `${m.method}: ${m.amount.toLocaleString()}`).join(', ') || '—';
  }

  print(): void {
    const styleId = 'thermal-page-size';
    const styleEl = document.getElementById(styleId);
    // The POS receipt flow leaves a thermal @page size behind; the closing
    // sheet is an A4 document, so reset it before printing.
    if (styleEl) styleEl.textContent = '@page { size: A4 landscape; margin: 10mm; }';
    window.print();
  }
}
