import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../environments/environment';
import { ConfirmService } from '../../core/services/confirm.service';
import { MenuService } from '../../core/services/menu.service';
import { NotificationService } from '../../core/services/notification.service';
import { MasterField } from '../../shared/models/master-config.model';
import { QuickAddDialogComponent, QuickAddDialogData } from '../../shared/components/quick-add-dialog/quick-add-dialog.component';
import { BRAND_CONFIG, FABRIC_CONFIG, SUIT_TYPE_CONFIG } from '../masters/master-configs';

interface LookupDto {
  id: string;
  name: string;
}

const CATEGORY_QUICK_ADD_FIELDS: MasterField[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'isActive', label: 'Active', type: 'checkbox' }
];

/** The API serializes enums by name (JsonStringEnumConverter), not by number. */
type ProductLineValue = 'Men' | 'Women' | 'Kids';
type StitchTypeValue = 'Unstitched' | 'Stitched';

interface ProductDto {
  id: string;
  name: string;
  description: string | null;
  productLine: ProductLineValue;
  stitchType: StitchTypeValue;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string | null;
  fabricId: string | null;
  fabricName: string | null;
  suitTypeId: string | null;
  suitTypeName: string | null;
  isActive: boolean;
  variantCount: number;
}

type ProductForm = {
  name: string;
  description: string;
  productLine: ProductLineValue;
  stitchType: StitchTypeValue;
  categoryId: string | null;
  brandId: string | null;
  fabricId: string | null;
  suitTypeId: string | null;
  isActive: boolean;
};

const PRODUCT_LINES: { value: ProductLineValue; label: string }[] = [
  { value: 'Men', label: 'Men' },
  { value: 'Women', label: 'Women' },
  { value: 'Kids', label: 'Kids' }
];

const STITCH_TYPES: { value: StitchTypeValue; label: string }[] = [
  { value: 'Unstitched', label: 'Unstitched' },
  { value: 'Stitched', label: 'Stitched' }
];

@Component({
  selector: 'app-products',
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
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  private readonly baseUrl = `${environment.apiUrl}/products`;

  products = signal<ProductDto[]>([]);
  categories = signal<LookupDto[]>([]);
  brands = signal<LookupDto[]>([]);
  fabrics = signal<LookupDto[]>([]);
  suitTypes = signal<LookupDto[]>([]);

  loading = signal(false);
  showForm = false;
  editingId: string | null = null;

  productLines = PRODUCT_LINES;
  stitchTypes = STITCH_TYPES;

  formModel: ProductForm = this.emptyForm();

  constructor(
    private http: HttpClient,
    private confirmDialog: ConfirmService,
    private notify: NotificationService,
    private dialog: MatDialog,
    public menuService: MenuService
  ) {}

  ngOnInit(): void {
    this.load();
    this.http.get<LookupDto[]>(`${environment.apiUrl}/categories`).subscribe((d) => this.categories.set(d));
    this.http.get<LookupDto[]>(`${environment.apiUrl}/brands`).subscribe((d) => this.brands.set(d));
    this.http.get<LookupDto[]>(`${environment.apiUrl}/fabrics`).subscribe((d) => this.fabrics.set(d));
    this.http.get<LookupDto[]>(`${environment.apiUrl}/suittypes`).subscribe((d) => this.suitTypes.set(d));
  }

  load(): void {
    this.loading.set(true);
    this.http.get<ProductDto[]>(`${this.baseUrl}?includeInactive=true`).subscribe({
      next: (data) => {
        this.products.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.notify.error('Failed to load products.');
        this.loading.set(false);
      }
    });
  }

  startCreate(): void {
    this.editingId = null;
    this.formModel = this.emptyForm();
    this.showForm = true;
  }

  startEdit(p: ProductDto): void {
    this.editingId = p.id;
    this.formModel = {
      name: p.name,
      description: p.description ?? '',
      productLine: p.productLine,
      stitchType: p.stitchType,
      categoryId: p.categoryId,
      brandId: p.brandId,
      fabricId: p.fabricId,
      suitTypeId: p.suitTypeId,
      isActive: p.isActive
    };
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
  }

  save(): void {
    const request$ = this.editingId
      ? this.http.put(`${this.baseUrl}/${this.editingId}`, this.formModel)
      : this.http.post(this.baseUrl, this.formModel);

    request$.subscribe({
      next: () => {
        this.showForm = false;
        this.notify.success(this.editingId ? 'Product updated.' : 'Product created.');
        this.load();
      },
      error: (err) => this.notify.error(err?.error?.error ?? 'Save failed.')
    });
  }

  remove(p: ProductDto): void {
    this.confirmDialog
      .ask({
        title: 'Delete product?',
        message: `Delete product "${p.name}"? Its variants must be removed first if any exist.`,
        confirmLabel: 'Delete',
        danger: true
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.http.delete(`${this.baseUrl}/${p.id}`).subscribe({
          next: () => {
            this.notify.success('Product deleted.');
            this.load();
          },
          error: (err) => this.notify.error(err?.error?.error ?? 'Delete failed.')
        });
      });
  }

  addCategory(): void {
    this.openQuickAdd(
      { title: 'New Category', resource: 'categories', fields: CATEGORY_QUICK_ADD_FIELDS, icon: 'category' },
      (created) => {
        this.categories.update((list) => [...list, created]);
        this.formModel.categoryId = created.id;
      }
    );
  }

  addBrand(): void {
    this.openQuickAdd({ title: 'New Brand', resource: 'brands', fields: BRAND_CONFIG.fields, icon: 'label' }, (created) => {
      this.brands.update((list) => [...list, created]);
      this.formModel.brandId = created.id;
    });
  }

  addFabric(): void {
    this.openQuickAdd({ title: 'New Fabric', resource: 'fabrics', fields: FABRIC_CONFIG.fields, icon: 'texture' }, (created) => {
      this.fabrics.update((list) => [...list, created]);
      this.formModel.fabricId = created.id;
    });
  }

  addSuitType(): void {
    this.openQuickAdd(
      { title: 'New Suit Type', resource: 'suittypes', fields: SUIT_TYPE_CONFIG.fields, icon: 'checkroom' },
      (created) => {
        this.suitTypes.update((list) => [...list, created]);
        this.formModel.suitTypeId = created.id;
      }
    );
  }

  private openQuickAdd(data: QuickAddDialogData, onCreated: (created: any) => void): void {
    this.dialog
      .open(QuickAddDialogComponent, { data, width: '420px' })
      .afterClosed()
      .subscribe((created) => {
        if (!created) return;
        onCreated(created);
        this.notify.success(`${data.title.replace('New ', '')} added.`);
      });
  }

  lineLabel(v: ProductLineValue): string {
    return this.productLines.find((l) => l.value === v)?.label ?? '—';
  }

  stitchLabel(v: StitchTypeValue): string {
    return this.stitchTypes.find((s) => s.value === v)?.label ?? '—';
  }

  private emptyForm(): ProductForm {
    return {
      name: '',
      description: '',
      productLine: 'Men',
      stitchType: 'Unstitched',
      categoryId: null,
      brandId: null,
      fabricId: null,
      suitTypeId: null,
      isActive: true
    };
  }
}
