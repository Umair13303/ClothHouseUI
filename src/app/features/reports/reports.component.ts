import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { environment } from '../../../environments/environment';
import { NativeDatePickerDirective } from '../../shared/directives/native-date-picker.directive';

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, NativeDatePickerDirective],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
  private readonly base = `${environment.apiUrl}/reports`;

  fromDate = firstOfMonth();
  toDate = today();
  groupByMonth = false;
  stockGroupBy = 'category';
  slowMovingDays = 60;

  sales = signal<any[]>([]);
  purchases = signal<any[]>([]);
  profitAndLoss = signal<any | null>(null);
  stock = signal<any[]>([]);
  lowStock = signal<any[]>([]);
  customerOutstanding = signal<any[]>([]);
  vendorOutstanding = signal<any[]>([]);
  topSelling = signal<any[]>([]);
  slowMoving = signal<any[]>([]);
  cashBook = signal<any[]>([]);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadSales();
    this.loadPurchases();
    this.loadProfitAndLoss();
    this.loadStock();
    this.loadLowStock();
    this.loadOutstanding();
    this.loadTopSelling();
    this.loadSlowMoving();
    this.loadCashBook();
  }

  private dateParams() {
    return { fromDate: this.fromDate, toDate: this.toDate, groupByMonth: this.groupByMonth };
  }

  loadSales(): void {
    this.http.get<any[]>(`${this.base}/sales`, { params: this.dateParams() }).subscribe((d) => this.sales.set(d));
  }

  loadPurchases(): void {
    this.http.get<any[]>(`${this.base}/purchases`, { params: this.dateParams() }).subscribe((d) => this.purchases.set(d));
  }

  loadProfitAndLoss(): void {
    this.http.get<any>(`${this.base}/profit-loss`, { params: { fromDate: this.fromDate, toDate: this.toDate } }).subscribe((d) => this.profitAndLoss.set(d));
  }

  loadStock(): void {
    this.http.get<any[]>(`${this.base}/stock`, { params: { groupBy: this.stockGroupBy } }).subscribe((d) => this.stock.set(d));
  }

  loadLowStock(): void {
    this.http.get<any[]>(`${this.base}/low-stock`).subscribe((d) => this.lowStock.set(d));
  }

  loadOutstanding(): void {
    this.http.get<any[]>(`${this.base}/customer-outstanding`).subscribe((d) => this.customerOutstanding.set(d));
    this.http.get<any[]>(`${this.base}/vendor-outstanding`).subscribe((d) => this.vendorOutstanding.set(d));
  }

  loadTopSelling(): void {
    this.http
      .get<any[]>(`${this.base}/top-selling`, { params: { fromDate: this.fromDate, toDate: this.toDate, take: 20 } })
      .subscribe((d) => this.topSelling.set(d));
  }

  loadSlowMoving(): void {
    this.http
      .get<any[]>(`${this.base}/slow-moving`, { params: { daysSinceLastSale: this.slowMovingDays, take: 20 } })
      .subscribe((d) => this.slowMoving.set(d));
  }

  loadCashBook(): void {
    this.http.get<any[]>(`${this.base}/cashbook`, { params: { fromDate: this.fromDate, toDate: this.toDate } }).subscribe((d) => this.cashBook.set(d));
  }
}
