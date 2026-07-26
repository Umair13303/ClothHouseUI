import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { ExpensesComponent } from './features/accounts/expenses/expenses.component';
import { LedgerComponent } from './features/accounts/ledger/ledger.component';
import { PaymentsComponent } from './features/accounts/payments/payments.component';
import { ReceiptsComponent } from './features/accounts/receipts/receipts.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CategoryComponent } from './features/masters/category/category.component';
import { MasterCrudComponent } from './features/masters/master-crud.component';
import {
  BRAND_CONFIG,
  COLOR_CONFIG,
  EXPENSE_CATEGORY_CONFIG,
  FABRIC_CONFIG,
  SUIT_TYPE_CONFIG,
  UNIT_CONFIG
} from './features/masters/master-configs';
import { BarcodePrintComponent } from './features/inventory/barcode-print/barcode-print.component';
import { OpeningStockComponent } from './features/inventory/opening-stock/opening-stock.component';
import { StockAdjustmentComponent } from './features/inventory/stock-adjustment/stock-adjustment.component';
import { CustomersComponent } from './features/parties/customers/customers.component';
import { VendorsComponent } from './features/parties/vendors/vendors.component';
import { GoodsReceiveComponent } from './features/purchases/goods-receive/goods-receive.component';
import { PurchaseInvoiceComponent } from './features/purchases/purchase-invoice/purchase-invoice.component';
import { PurchaseReturnComponent } from './features/purchases/purchase-return/purchase-return.component';
import { ReportsComponent } from './features/reports/reports.component';
import { PosComponent } from './features/sales/pos/pos.component';
import { InvoicePrintComponent } from './features/sales/invoice-print/invoice-print.component';
import { DayClosingComponent } from './features/sales/day-closing/day-closing.component';
import { OffersComponent } from './features/sales/offers/offers.component';
import { SalesReturnComponent } from './features/sales/sales-return/sales-return.component';
import { VoucherPrintComponent } from './features/accounts/voucher-print/voucher-print.component';
import { SettingsComponent } from './features/settings/settings.component';
import { ProductVariantsComponent } from './features/products/product-variants/product-variants.component';
import { ProductsComponent } from './features/products/products.component';
import { RolesPermissionsComponent } from './features/settings/roles-permissions/roles-permissions.component';
import { UsersComponent } from './features/settings/users/users.component';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    canActivateChild: [permissionGuard],
    children: [
      { path: '', component: DashboardComponent, data: { menuKey: 'dashboard' } },
      { path: 'masters/categories', component: CategoryComponent, data: { menuKey: 'categories' } },
      { path: 'masters/brands', component: MasterCrudComponent, data: { config: BRAND_CONFIG, menuKey: 'brands' } },
      { path: 'masters/fabrics', component: MasterCrudComponent, data: { config: FABRIC_CONFIG, menuKey: 'fabrics' } },
      { path: 'masters/colors', component: MasterCrudComponent, data: { config: COLOR_CONFIG, menuKey: 'colors' } },
      { path: 'masters/suit-types', component: MasterCrudComponent, data: { config: SUIT_TYPE_CONFIG, menuKey: 'suittypes' } },
      { path: 'masters/units', component: MasterCrudComponent, data: { config: UNIT_CONFIG, menuKey: 'units' } },
      { path: 'masters/expense-categories', component: MasterCrudComponent, data: { config: EXPENSE_CATEGORY_CONFIG, menuKey: 'expensecategories' } },
      { path: 'products', component: ProductsComponent, data: { menuKey: 'products' } },
      { path: 'products/:productId/variants', component: ProductVariantsComponent, data: { menuKey: 'products' } },
      { path: 'customers', component: CustomersComponent, data: { menuKey: 'customers' } },
      { path: 'vendors', component: VendorsComponent, data: { menuKey: 'vendors' } },
      { path: 'inventory/opening-stock', component: OpeningStockComponent, data: { menuKey: 'opening-stock' } },
      { path: 'inventory/stock-adjustment', component: StockAdjustmentComponent, data: { menuKey: 'stock-adjustment' } },
      { path: 'inventory/barcode-print', component: BarcodePrintComponent, data: { menuKey: 'barcode-print' } },
      { path: 'purchases/invoices', component: PurchaseInvoiceComponent, data: { menuKey: 'purchase-invoices' } },
      { path: 'purchases/goods-receive', component: GoodsReceiveComponent, data: { menuKey: 'goods-receive' } },
      { path: 'purchases/returns', component: PurchaseReturnComponent, data: { menuKey: 'purchase-returns' } },
      { path: 'sales/pos', component: PosComponent, data: { menuKey: 'sales-pos' } },
      { path: 'sales/invoice-print/:id', component: InvoicePrintComponent, data: { menuKey: 'sales-pos' } },
      { path: 'sales/day-closing', component: DayClosingComponent, data: { menuKey: 'day-closing' } },
      { path: 'sales/returns', component: SalesReturnComponent, data: { menuKey: 'sales-returns' } },
      { path: 'sales/offers', component: OffersComponent, data: { menuKey: 'sale-offers' } },
      { path: 'accounts/customer-ledger', component: LedgerComponent, data: { type: 'customer', showTitle: true, menuKey: 'customer-ledger' } },
      { path: 'accounts/vendor-ledger', component: LedgerComponent, data: { type: 'vendor', showTitle: true, menuKey: 'vendor-ledger' } },
      { path: 'accounts/receipts', component: ReceiptsComponent, data: { menuKey: 'receipts' } },
      { path: 'accounts/receipts/print/:id', component: VoucherPrintComponent, data: { kind: 'receipt', menuKey: 'receipts' } },
      { path: 'accounts/payments', component: PaymentsComponent, data: { menuKey: 'payments' } },
      { path: 'accounts/payments/print/:id', component: VoucherPrintComponent, data: { kind: 'payment', menuKey: 'payments' } },
      { path: 'accounts/expenses', component: ExpensesComponent, data: { menuKey: 'expenses' } },
      { path: 'reports', component: ReportsComponent, data: { menuKey: 'reports' } },
      { path: 'settings', component: SettingsComponent, data: { menuKey: 'settings' } },
      { path: 'settings/roles', component: RolesPermissionsComponent, data: { menuKey: 'roles-permissions' } },
      { path: 'settings/users', component: UsersComponent, data: { menuKey: 'users' } }
    ]
  },
  { path: '**', redirectTo: '' }
];
