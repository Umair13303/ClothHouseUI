import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MenuService } from '../../core/services/menu.service';
import { SalesTrendChartComponent, TrendPoint } from './sales-trend-chart.component';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const TREND_DAYS = 14;
const TOP_CUSTOMERS_COUNT = 10;

interface OutstandingBalanceDto {
  partyId: string;
  partyName: string;
  phone: string | null;
  balance: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, RouterLink, SalesTrendChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly base = `${environment.apiUrl}/reports`;

  todaySales = signal(0);
  receivables = signal(0);
  payables = signal(0);
  lowStockCount = signal(0);
  salesTrend = signal<TrendPoint[]>([]);
  topOutstandingCustomers = signal<OutstandingBalanceDto[]>([]);

  constructor(private http: HttpClient, public menuService: MenuService) {}

  ngOnInit(): void {
    const t = today();

    this.http
      .get<any[]>(`${this.base}/sales`, { params: { fromDate: t, toDate: t, groupByMonth: false } })
      .subscribe((rows) => this.todaySales.set(rows.reduce((sum, r) => sum + (r.netSales ?? 0), 0)));

    this.http.get<OutstandingBalanceDto[]>(`${this.base}/customer-outstanding`).subscribe((rows) => {
      // Already SQL-sorted descending and filtered to Balance > 0 (ReportService.GetCustomerOutstandingAsync) — just take the top slice.
      this.receivables.set(rows.reduce((sum, r) => sum + (r.balance ?? 0), 0));
      this.topOutstandingCustomers.set(rows.slice(0, TOP_CUSTOMERS_COUNT));
    });

    this.http
      .get<any[]>(`${this.base}/vendor-outstanding`)
      .subscribe((rows) => this.payables.set(rows.reduce((sum, r) => sum + (r.balance ?? 0), 0)));

    this.http
      .get<any[]>(`${this.base}/low-stock`)
      .subscribe((rows) => this.lowStockCount.set(rows.length));

    const from = new Date();
    from.setDate(from.getDate() - (TREND_DAYS - 1));
    const fromStr = from.toISOString().slice(0, 10);

    this.http
      .get<any[]>(`${this.base}/sales`, { params: { fromDate: fromStr, toDate: t, groupByMonth: false } })
      .subscribe((rows) => this.salesTrend.set(this.buildTrend(rows, from)));
  }

  private buildTrend(rows: any[], from: Date): TrendPoint[] {
    const byDate = new Map<string, number>(rows.map((r) => [r.periodLabel, r.netSales ?? 0]));
    const points: TrendPoint[] = [];
    for (let i = 0; i < TREND_DAYS; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      points.push({
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: byDate.get(key) ?? 0
      });
    }
    return points;
  }
}
