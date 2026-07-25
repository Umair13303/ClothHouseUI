import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';
import { NotificationService } from '../../../core/services/notification.service';

interface AdjustmentLine {
  variantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  currentStock: number;
  quantityChange: number;
}

interface StockAdjustmentListDto {
  id: string;
  referenceNumber: string;
  adjustmentDate: string;
  reason: string;
  items: { quantityChange: number }[];
}

@Component({
  selector: 'app-stock-adjustment',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, VariantPickerComponent],
  templateUrl: './stock-adjustment.component.html',
  styleUrl: './stock-adjustment.component.scss'
})
export class StockAdjustmentComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/stockadjustments`;

  adjustmentDate = new Date().toISOString().slice(0, 10);
  reason = '';
  lines: AdjustmentLine[] = [];

  history = signal<StockAdjustmentListDto[]>([]);
  loadingHistory = signal(false);
  saving = signal(false);

  constructor(private http: HttpClient, private notify: NotificationService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.http.get<StockAdjustmentListDto[]>(this.baseUrl).subscribe({
      next: (data) => {
        this.history.set(data);
        this.loadingHistory.set(false);
      },
      error: () => this.loadingHistory.set(false)
    });
  }

  addVariant(v: VariantSearchResult): void {
    if (this.lines.some((l) => l.variantId === v.id)) return;
    this.lines.push({
      variantId: v.id,
      barcode: v.barcode,
      productName: v.productName,
      designNumber: v.designNumber,
      currentStock: v.currentStock,
      quantityChange: 0
    });
  }

  removeLine(i: number): void {
    this.lines.splice(i, 1);
  }

  submit(): void {
    if (this.lines.length === 0) {
      this.notify.error('Add at least one item.');
      return;
    }
    if (!this.reason.trim()) {
      this.notify.error('A reason is required for stock adjustments.');
      return;
    }
    if (this.lines.some((l) => l.quantityChange === 0)) {
      this.notify.error('Enter a non-zero quantity change for every line.');
      return;
    }

    this.saving.set(true);
    const payload = {
      referenceNumber: null,
      adjustmentDate: this.adjustmentDate,
      reason: this.reason,
      items: this.lines.map((l) => ({ productVariantId: l.variantId, quantityChange: l.quantityChange }))
    };

    this.http.post(this.baseUrl, payload).subscribe({
      next: () => {
        this.notify.success('Stock adjustment posted successfully.');
        this.lines = [];
        this.reason = '';
        this.saving.set(false);
        this.loadHistory();
      },
      error: (err) => {
        this.notify.error(err?.error?.error ?? 'Failed to post stock adjustment.');
        this.saving.set(false);
      }
    });
  }

  netChange(items: { quantityChange: number }[]): number {
    return items.reduce((sum, i) => sum + i.quantityChange, 0);
  }
}
