import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewChecked, Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';
import { VariantPickerComponent, VariantSearchResult } from '../../../shared/components/variant-picker/variant-picker.component';

declare const JsBarcode: any;

interface BarcodeLabelDto {
  productVariantId: string;
  barcode: string;
  productName: string;
  designNumber: string;
  colorName: string | null;
  price: number;
  unitOfMeasureName: string;
}

interface LabelCopy extends BarcodeLabelDto {
  svgId: string;
}

@Component({
  selector: 'app-barcode-print',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatButtonToggleModule, VariantPickerComponent],
  templateUrl: './barcode-print.component.html',
  styleUrl: './barcode-print.component.scss'
})
export class BarcodePrintComponent implements OnInit, AfterViewChecked {
  /** Optional query param — comma-separated or repeated variantIds from the "Print barcode" link on the Variants screen. */
  @Input() variantIds: string | string[] | null = null;

  labels = signal<LabelCopy[]>([]);
  labelSize: 'thermal' | 'a4' = 'thermal';
  private rendered = new Set<string>();
  private pendingCopies = new Map<string, number>();

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const ids = this.variantIds ? (Array.isArray(this.variantIds) ? this.variantIds : [this.variantIds]) : [];
    if (ids.length > 0) this.fetchAndAdd(ids);
  }

  ngAfterViewChecked(): void {
    for (const label of this.labels()) {
      if (this.rendered.has(label.svgId)) continue;
      const el = document.getElementById(label.svgId);
      if (el && typeof JsBarcode !== 'undefined') {
        JsBarcode(el, label.barcode, { format: 'CODE128', width: 1.6, height: 40, fontSize: 12, margin: 2 });
        this.rendered.add(label.svgId);
      }
    }
  }

  addVariant(v: VariantSearchResult): void {
    this.fetchAndAdd([v.id]);
  }

  private fetchAndAdd(ids: string[]): void {
    this.http.get<BarcodeLabelDto[]>(`${environment.apiUrl}/barcode/labels`, { params: { variantIds: ids } }).subscribe((data) => {
      const copies: LabelCopy[] = data.map((d, i) => ({ ...d, svgId: `bc-${d.productVariantId}-${Date.now()}-${i}` }));
      this.labels.set([...this.labels(), ...copies]);
    });
  }

  duplicateLabel(label: LabelCopy): void {
    const copy: LabelCopy = { ...label, svgId: `bc-${label.productVariantId}-${Date.now()}-dup` };
    this.labels.set([...this.labels(), copy]);
  }

  removeLabel(svgId: string): void {
    this.labels.set(this.labels().filter((l) => l.svgId !== svgId));
    this.rendered.delete(svgId);
  }

  clearAll(): void {
    this.labels.set([]);
    this.rendered.clear();
  }

  print(): void {
    window.print();
  }
}
