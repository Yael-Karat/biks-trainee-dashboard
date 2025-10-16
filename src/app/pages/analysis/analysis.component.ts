import { Component, OnInit } from '@angular/core';
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
import { ChartConfiguration, ChartType } from 'chart.js';
import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';

// Chart.js registration
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

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

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
    BaseChartDirective
  ]
})
export class AnalysisComponent implements OnInit {
  trainees: Trainee[] = [];
  subjects: string[] = [];

  selectedTrainees: number[] = [];
  selectedSubjects: string[] = [];

  charts: any[] = [];
  hiddenChart: any;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    // Restore previous state if exists
    const savedState = localStorage.getItem('analysisFilters');
    if (savedState) {
      const { selectedTrainees, selectedSubjects } = JSON.parse(savedState);
      this.selectedTrainees = selectedTrainees || [];
      this.selectedSubjects = selectedSubjects || [];
    }

    this.dataService.trainees$.subscribe(data => {
      this.trainees = data;
      this.subjects = Array.from(new Set(data.map(t => t.subject)));

      // Ensure filters exist even if state was empty
      this.selectedTrainees = this.selectedTrainees || [];
      this.selectedSubjects = this.selectedSubjects || [];
      setTimeout(() => {
            this.updateCharts();
          }, 50); // small delay ensures filters render first
      });
  }

  updateCharts(): void {
    // Save current state
    this.saveFilterState();

    // Filter data
    const traineesToShow = this.selectedTrainees.length > 0
      ? this.trainees.filter(t => this.selectedTrainees.includes(t.id))
      : this.trainees;

    const subjectsToShow = this.selectedSubjects.length > 0
      ? this.selectedSubjects
      : this.subjects;

    // === Chart 1: Grades over time (per trainee) ===
    const uniqueDates = Array.from(
      new Set(traineesToShow.map(t => t.date))
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const uniqueTraineeIds = Array.from(new Set(traineesToShow.map(t => t.id)));

    const chart1Datasets = uniqueTraineeIds.map(id => {
      const traineeName = this.trainees.find(t => t.id === id)?.name || `Trainee ${id}`;
      const traineeData = traineesToShow
        .filter(t => t.id === id && subjectsToShow.includes(t.subject))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        label: traineeName,
        data: uniqueDates.map(date => {
          const entry = traineeData.find(t => t.date === date);
          return entry ? entry.grade : null;
        }),
        fill: false,
        borderColor: this.getRandomColor(),
        tension: 0.1
      };
    });

    const chart1: any = {
      title: 'Grades Over Time (Per Trainee)',
      type: 'line' as ChartType,
      data: { labels: uniqueDates, datasets: chart1Datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { beginAtZero: true, max: 100, title: { display: true, text: 'Grade' } },
          x: { title: { display: true, text: 'Date' } }
        },
        plugins: {
          legend: { position: 'bottom' as const },
          title: { display: false }
        }
      } as ChartConfiguration['options']
    };

    // === Chart 2: Average grade per trainee ===
    const traineeAverages = uniqueTraineeIds.map(id => {
      const trainee = this.trainees.find(t => t.id === id);
      const grades = traineesToShow
        .filter(t => t.id === id && subjectsToShow.includes(t.subject))
        .map(t => t.grade);
      const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      return { name: trainee?.name || `Trainee ${id}`, avg: Math.round(avg * 100) / 100 };
    });

    const chart2: any = {
      title: 'Average Grade per Trainee',
      type: 'bar' as ChartType,
      data: {
        labels: traineeAverages.map(t => t.name),
        datasets: [{
          label: 'Average Grade',
          data: traineeAverages.map(t => t.avg),
          backgroundColor: '#42A5F5',
          borderColor: '#1976D2',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: { beginAtZero: true, max: 100, title: { display: true, text: 'Average Grade' } },
          x: { title: { display: true, text: 'Trainee' } }
        },
        plugins: { legend: { display: true, position: 'bottom' as const } }
      } as ChartConfiguration['options']
    };

    // === Hidden Chart: Average grade per subject ===
    const subjectAverages = subjectsToShow.map(subject => {
      const grades = traineesToShow.filter(t => t.subject === subject).map(t => t.grade);
      const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      return { subject, avg: Math.round(avg * 100) / 100 };
    });

    const hiddenChart: any = {
      title: 'Average Grade per Subject',
      type: 'pie' as ChartType,
      data: {
        labels: subjectAverages.map(s => s.subject),
        datasets: [{
          data: subjectAverages.map(s => s.avg),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'right' as const } }
      } as ChartConfiguration['options']
    };

    this.charts = [chart1, chart2];
    this.hiddenChart = hiddenChart;
  }

  drop(event: CdkDragDrop<any[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      moveItemInArray(this.charts, event.previousIndex, event.currentIndex);
    }
  }

  swapHiddenChart(): void {
    if (!this.hiddenChart || this.charts.length < 2) return;
    const temp = this.charts[1];
    this.charts[1] = this.hiddenChart;
    this.hiddenChart = temp;
    this.saveFilterState();
  }

  clearIds(): void {
    this.selectedTrainees = [];
    this.updateCharts();
  }

  clearSubjects(): void {
    this.selectedSubjects = [];
    this.updateCharts();
  }

  private saveFilterState(): void {
    localStorage.setItem('analysisFilters', JSON.stringify({
      selectedTrainees: this.selectedTrainees,
      selectedSubjects: this.selectedSubjects
    }));
  }

  private getRandomColor(): string {
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#4BC0C0'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
