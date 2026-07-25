import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

export interface TrendPoint {
  label: string;
  value: number;
}

/**
 * Hand-rolled SVG line/area chart — a single series (net sales per day), so
 * per the dataviz method this needs no legend or categorical palette, just
 * the app's own primary hue, gridlines, an end-point marker, and a
 * crosshair + tooltip on hover.
 */
@Component({
  selector: 'app-sales-trend-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-trend-chart.component.html',
  styleUrl: './sales-trend-chart.component.scss'
})
export class SalesTrendChartComponent {
  @Input() data: TrendPoint[] = [];

  hoverIndex = signal<number | null>(null);

  readonly width = 760;
  readonly height = 220;
  readonly paddingLeft = 56;
  readonly paddingRight = 12;
  readonly paddingTop = 16;
  readonly paddingBottom = 26;

  get innerWidth(): number {
    return this.width - this.paddingLeft - this.paddingRight;
  }

  get innerHeight(): number {
    return this.height - this.paddingTop - this.paddingBottom;
  }

  get maxValue(): number {
    const max = Math.max(1, ...this.data.map((d) => d.value));
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
    const rounded = Math.ceil(max / magnitude) * magnitude;
    return rounded || 1;
  }

  xFor(i: number): number {
    const n = this.data.length;
    if (n <= 1) return this.paddingLeft;
    return this.paddingLeft + (i / (n - 1)) * this.innerWidth;
  }

  yFor(value: number): number {
    return this.paddingTop + this.innerHeight - (value / this.maxValue) * this.innerHeight;
  }

  get linePath(): string {
    return this.data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${this.xFor(i).toFixed(1)} ${this.yFor(d.value).toFixed(1)}`).join(' ');
  }

  get areaPath(): string {
    if (this.data.length === 0) return '';
    const base = this.paddingTop + this.innerHeight;
    const first = this.xFor(0);
    const last = this.xFor(this.data.length - 1);
    return `${this.linePath} L ${last.toFixed(1)} ${base} L ${first.toFixed(1)} ${base} Z`;
  }

  get gridLines(): number[] {
    const steps = 4;
    const max = this.maxValue;
    return Array.from({ length: steps + 1 }, (_, i) => (max / steps) * i);
  }

  get labelIndices(): number[] {
    const n = this.data.length;
    if (n <= 6) return this.data.map((_, i) => i);
    const step = Math.ceil(n / 6);
    const idxs: number[] = [];
    for (let i = 0; i < n; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== n - 1) idxs.push(n - 1);
    return idxs;
  }

  get lastIndex(): number {
    return this.data.length - 1;
  }

  get hoverPoint(): TrendPoint | null {
    const idx = this.hoverIndex();
    return idx === null ? null : (this.data[idx] ?? null);
  }

  get tooltipLeftPercent(): number {
    const idx = this.hoverIndex();
    if (idx === null) return 0;
    return (this.xFor(idx) / this.width) * 100;
  }

  onPointerMove(evt: PointerEvent): void {
    if (this.data.length === 0) return;
    const rect = (evt.currentTarget as SVGSVGElement).getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const localX = (evt.clientX - rect.left) * scaleX;

    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < this.data.length; i++) {
      const dist = Math.abs(this.xFor(i) - localX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    this.hoverIndex.set(nearest);
  }

  onPointerLeave(): void {
    this.hoverIndex.set(null);
  }
}
