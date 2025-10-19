import { Component, OnInit, ChangeDetectorRef, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType, ChartData, registerables } from 'chart.js';
import { DataService } from '../../services/data.service';
import { StateService } from '../../services/state.service';
import { Trainee } from '../../models/trainee';
import { UniqueByIdPipe } from '../../pipes/unique-by-id.pipe';

Chart.register(...registerables);

import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartConfig {
  title: string;
  type: ChartType;
  data: ChartData;
  options: ChartConfiguration['options'];
}

@Component({
  selector: 'app-analysis',
  standalone: true,
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    DragDropModule,
    BaseChartDirective,
    UniqueByIdPipe
  ]
})
export class AnalysisComponent implements OnInit, AfterViewInit {
  trainees: Trainee[] = [];
  subjects: string[] = [];

  selectedTrainees: number[] = [];
  selectedSubjects: string[] = [];
  currentTraineeIndex = 0;

  hiddenChartVisible = false;

  // two visible slots (chart0, chart1). Use null when slot is empty.
  charts: (ChartConfig | null)[] = [null, null];
  hiddenChart: ChartConfig | null = null;

  @ViewChildren(BaseChartDirective) chartDirectives!: QueryList<BaseChartDirective>;

  constructor(
    private dataService: DataService,
    private stateService: StateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const saved = this.stateService.getAnalysisState();
    this.selectedTrainees = saved?.traineeIds || [];
    this.selectedSubjects = saved?.subjects || [];
    this.currentTraineeIndex = saved?.currentTraineeIndex || 0;

    this.dataService.trainees$.subscribe(data => {
      this.trainees = data ?? [];
      this.subjects = Array.from(new Set(this.trainees.map(t => t.subject)));
      // slight delay to allow template to react before updateCharts
      setTimeout(() => this.updateCharts(), 50);
    });
  }

  ngAfterViewInit(): void {
    // when the chart directives change (new canvases created), update Chart.js instances
    this.chartDirectives.changes.subscribe(() => {
      // small task to let DOM render
      setTimeout(() => {
        this.updateAllCharts();
      }, 0);
    });
  }

  private saveAnalysisState(): void {
    this.stateService.setAnalysisState({
      traineeIds: this.selectedTrainees,
      subjects: this.selectedSubjects,
      currentTraineeIndex: this.currentTraineeIndex
    });
  }

  private updateAllCharts(): void {
    // call update() on each BaseChartDirective if chart exists
    try {
      this.chartDirectives?.forEach(d => {
        if (d && (d as any).chart) {
          try { (d as any).chart.update(); } catch { /* ignore per-chart errors */ }
        }
      });
    } catch {
      // ignore
    }
  }

  updateCharts(): void {
    this.saveAnalysisState();

    // ---------- Chart 1: Average Grades Over Time (per selected trainee) ----------
    let chart1: ChartConfig | null = null;
    if (this.selectedTrainees.length > 0) {
      // Filter only by selected trainee IDs
      const traineesToShow = this.trainees.filter(t => this.selectedTrainees.includes(t.id));

      if (traineesToShow.length > 0) {
        const uniqueDates = Array.from(new Set(traineesToShow.map(r => r.date)))
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const datasets = traineesToShow.map((trainee, idx) => {
          const dataForTrainee = traineesToShow.filter(r => r.id === trainee.id);
          const data = uniqueDates.map(date => {
            const entries = dataForTrainee.filter(e => e.date === date);
            if (!entries.length) return null;
            const avg = entries.reduce((s, e) => s + e.grade, 0) / entries.length;
            return Math.round(avg * 100) / 100;
          });

          return {
            label: trainee.name,
            data,
            fill: false,
            borderColor: this.getColorByIndex(idx),
            backgroundColor: this.getColorByIndex(idx),
            tension: 0.15,
            pointRadius: 4
          };
        });

        chart1 = {
          title: 'Average Grades Over Time (Per Student)',
          type: 'line',
          data: { labels: uniqueDates, datasets: datasets as any },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Grade' } },
              x: { title: { display: true, text: 'Date' } }
            },
            plugins: { legend: { position: 'bottom' } }
          } as ChartConfiguration['options']
        };
      }
    }

    // ---------- Chart 3: Average Grade per Subject ----------
    let chart3: ChartConfig | null = null;
    if (this.selectedSubjects.length > 0) {
      // Filter only by selected subjects
      const subjectAverages = this.selectedSubjects.map(subject => {
        const grades = this.trainees.filter(r => r.subject === subject).map(r => r.grade);
        const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        return { subject, avg: Math.round(avg * 100) / 100 };
      });

      if (subjectAverages.length > 0) {
        chart3 = {
          title: 'Average Grades per Subject',
          type: 'bar',
          data: {
            labels: subjectAverages.map(s => s.subject),
            datasets: [{
              label: 'Average Grade',
              data: subjectAverages.map(s => s.avg),
              backgroundColor: subjectAverages.map((_, i) => this.getColorByIndex(i)),
              borderColor: subjectAverages.map((_, i) => this.getDarkerColorByIndex(i)),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Grade' } },
              x: { title: { display: true, text: 'Subject' } }
            },
            plugins: { legend: { display: false } }
          } as ChartConfiguration['options']
        };
      }
    }

    // ---------- Hidden Chart (average per trainee) ----------
    if (this.selectedTrainees.length > 0) {
      const traineeAverages = this.trainees
        .filter(t => this.selectedTrainees.includes(t.id))
        .map((trainee, idx) => {
          const grades = this.trainees.filter(r => r.id === trainee.id).map(r => r.grade);
          const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
          return { name: trainee.name, avg: Math.round(avg * 100) / 100 };
        });

      if (traineeAverages.length > 0) {
        this.hiddenChart = {
          title: 'Average Grade per Student (Selected IDs)',
          type: 'bar',
          data: {
            labels: traineeAverages.map(t => t.name),
            datasets: [{
              label: 'Average Grade',
              data: traineeAverages.map(t => t.avg),
              backgroundColor: traineeAverages.map((_, i) => this.getColorByIndex(i)),
              borderColor: traineeAverages.map((_, i) => this.getDarkerColorByIndex(i)),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Grade' } },
              x: { title: { display: true, text: 'Student' } }
            },
            plugins: { legend: { display: false } }
          } as ChartConfiguration['options']
        };
      } else {
        this.hiddenChart = null;
      }
    } else {
      this.hiddenChart = null;
    }

    // ---------- Preserve positions of visible slots ----------
    this.charts[0] = chart1;
    this.charts[1] = chart3;

    this.cdr.detectChanges();
    setTimeout(() => this.updateAllCharts(), 150);
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.charts, event.previousIndex, event.currentIndex);
      this.cdr.detectChanges();
      setTimeout(() => this.updateAllCharts(), 100);
    }
  }

  swapHiddenChart(): void {
    if (!this.hiddenChart) return;

    // swap with rightmost visible slot (index 1) if present, otherwise with slot 0
    const swapIndex = this.charts[1] ? 1 : 0;
    const tmp = this.charts[swapIndex];
    this.charts[swapIndex] = this.hiddenChart;
    this.hiddenChart = tmp;

    // show hidden chart only after swapping
    this.hiddenChartVisible = !!this.charts.includes(this.hiddenChart);

    this.saveAnalysisState();
    this.cdr.detectChanges();
    setTimeout(() => this.updateAllCharts(), 150);
  }

  clearIds(): void {
    this.selectedTrainees = [];
    this.updateCharts();
  }

  clearSubjects(): void {
    this.selectedSubjects = [];
    this.updateCharts();
  }

  private getColorByIndex(i: number): string {
    const c = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A'];
    return c[i % c.length];
  }

  private getDarkerColorByIndex(i: number): string {
    const c = ['#CC3355', '#1E88E5', '#CC9A2C', '#2B9A91', '#6A3FBF', '#CC6F20', '#A0A4A8', '#6BA035'];
    return c[i % c.length];
  }
}
