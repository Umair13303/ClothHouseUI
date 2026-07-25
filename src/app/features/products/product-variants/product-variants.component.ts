import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { NotificationService } from '../../../core/services/notification.service';

interface LookupDto {
  id: string;
  name: string;
}

interface ProductVariantDto {
  id: string;
  productId: string;
  productName: string;
  designNumber: string;
  colorId: string | null;
  colorName: string | null;
  unitOfMeasureId: string;
  unitOfMeasureName: string;
  barcode: string;
  defaultSalePrice: number;
  lastPurchasePrice: number;
  currentStock: number;
  reorderLevel: number;
  isActive: boolean;
}

type VariantForm = {
  designNumber: string;
  colorId: string | null;
  unitOfMeasureId: string | null;
  barcode: string;
  defaultSalePrice: number;
  reorderLevel: number;
  isActive: boolean;
};

@Component({
  selector: 'app-product-variants',
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
    MatCheckboxModule
  ],
  templateUrl: './product-variants.component.html',
  styleUrl: './product-variants.component.scss'
})
export class ProductVariantsComponent implements OnInit {
  @Input() productId!: string;

  productName = signal<string>('');
  variants = signal<ProductVariantDto[]>([]);
  colors = signal<LookupDto[]>([]);
  units = signal<LookupDto[]>([]);

  loading = signal(false);
  showForm = false;
  editingId: string | null = null;

  formModel: VariantForm = this.emptyForm();

  constructor(private http: HttpClient, private confirmDialog: ConfirmService, private notify: NotificationService) {}

  ngOnInit(): void {
    this.load();
    this.http.get<LookupDto[]>(`${environment.apiUrl}/colors`).subscribe((d) => this.colors.set(d));
    this.http.get<LookupDto[]>(`${environment.apiUrl}/units`).subscribe((d) => this.units.set(d));
  }

  load(): void {
    this.loading.set(true);
    this.http.get<{ name: string }>(`${environment.apiUrl}/products/${this.productId}`).subscribe((p) => this.productName.set(p.name));
    this.http.get<ProductVariantDto[]>(`${environment.apiUrl}/products/${this.productId}/variants`).subscribe({
      next: (data) => {
        this.variants.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load variants.');
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formModel = this.emptyForm();
    this.showForm = true;
  }

  startEdit(v: ProductVariantDto): void {
    this.editingId = v.id;
    this.formModel = {
      designNumber: v.designNumber,
      colorId: v.colorId,
      unitOfMeasureId: v.unitOfMeasureId,
      barcode: v.barcode,
      defaultSalePrice: v.defaultSalePrice,
      reorderLevel: v.reorderLevel,
      isActive: v.isActive
    };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  generateBarcode(): void {
    this.http.get(`${environment.apiUrl}/productvariants/generate-barcode`, { responseType: 'text' }).subscribe({
      next: (code) => (this.formModel.barcode = code.replace(/"/g, '')),
      error: () => this.notify.error('Failed to generate barcode.')
    });
  }

  save(): void {
    const payload = {
      productId: this.productId,
      designNumber: this.formModel.designNumber,
      colorId: this.formModel.colorId,
      unitOfMeasureId: this.formModel.unitOfMeasureId,
      barcode: this.formModel.barcode || null,
      defaultSalePrice: this.formModel.defaultSalePrice,
      reorderLevel: this.formModel.reorderLevel,
      isActive: this.formModel.isActive
    };

    const request$ = this.editingId
      ? this.http.put(`${environment.apiUrl}/productvariants/${this.editingId}`, payload)
      : this.http.post(`${environment.apiUrl}/productvariants`, payload);

    request$.subscribe({
      next: () => {
        this.showForm = false;
        this.notify.success(this.editingId ? 'Variant updated.' : 'Variant created.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Save failed.')
    });
  }

  remove(v: ProductVariantDto): void {
    this.confirmDialog
      .ask({
        title: 'Delete variant?',
        message: `Delete variant "${v.designNumber}" (${v.barcode})?`,
        confirmLabel: 'Delete',
        danger: true
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.http.delete(`${environment.apiUrl}/productvariants/${v.id}`).subscribe({
          next: () => {
            this.notify.success('Variant deleted.');
            this.load();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Delete failed.')
        });
      });
  }

  private emptyForm(): VariantForm {
    return { designNumber: '', colorId: null, unitOfMeasureId: null, barcode: '', defaultSalePrice: 0, reorderLevel: 0, isActive: true };
  }
}
