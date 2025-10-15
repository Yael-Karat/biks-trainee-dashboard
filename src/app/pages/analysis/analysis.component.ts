import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';

@Component({
  selector: 'app-analysis',
  standalone: true,
  templateUrl: './analysis.component.html',
  styleUrls: ['./analysis.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
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
    this.dataService.trainees$.subscribe(data => {
      this.trainees = data;

      this.subjects = Array.from(new Set(data.map(t => t.subject)));

      // Load last selections from localStorage
      const savedTrainees = localStorage.getItem('selectedTrainees');
      const savedSubjects = localStorage.getItem('selectedSubjects');
      if (savedTrainees) this.selectedTrainees = JSON.parse(savedTrainees);
      if (savedSubjects) this.selectedSubjects = JSON.parse(savedSubjects);

      this.updateCharts();
    });
  }

  updateCharts(): void {
    // Save selections to localStorage
    localStorage.setItem('selectedTrainees', JSON.stringify(this.selectedTrainees));
    localStorage.setItem('selectedSubjects', JSON.stringify(this.selectedSubjects));

    const filteredTrainees = this.selectedTrainees.length
      ? this.trainees.filter(t => this.selectedTrainees.includes(t.id))
      : this.trainees;

    const filteredSubjects = this.selectedSubjects.length
      ? this.selectedSubjects
      : this.subjects;

    // === Chart 1: Average grade per trainee ===
    const traineeAverages = Array.from(
      new Set(filteredTrainees.map(t => t.id))
    ).map(id => {
      const trainee = filteredTrainees.find(t => t.id === id);
      const grades = filteredTrainees
        .filter(t => t.id === id && filteredSubjects.includes(t.subject))
        .map(t => t.grade);
      const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      return { name: trainee?.name || 'Unknown', avg };
    });

    const chart1 = {
      title: 'Average Grade per Trainee',
      type: 'bar',
      data: {
        labels: traineeAverages.map(t => t.name),
        datasets: [
          {
            data: traineeAverages.map(t => t.avg),
            label: 'Average Grade',
            backgroundColor: '#42A5F5'
          }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: true, position: 'bottom' } }
      } as ChartConfiguration['options']
    };

    // === Chart 2: Average grade per subject ===
    const subjectAverages = filteredSubjects.map(subject => {
      const grades = filteredTrainees
        .filter(t => t.subject === subject)
        .map(t => t.grade);
      const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      return { subject, avg };
    });

    const chart2 = {
      title: 'Average Grade per Subject',
      type: 'line',
      data: {
        labels: subjectAverages.map(s => s.subject),
        datasets: [
          {
            data: subjectAverages.map(s => s.avg),
            label: 'Average Grade',
            borderColor: '#66BB6A',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: true, position: 'bottom' } }
      } as ChartConfiguration['options']
    };

    // === Hidden chart (pie) ===
    const hidden = {
      title: 'Distribution of Averages by Subject',
      type: 'pie',
      data: {
        labels: subjectAverages.map(s => s.subject),
        datasets: [
          {
            data: subjectAverages.map(s => s.avg),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#81C784', '#BA68C8']
          }
        ]
      },
      options: { responsive: true }
    };

    this.charts = [chart1, chart2];
    this.hiddenChart = hidden;
  }

  drop(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.charts, event.previousIndex, event.currentIndex);
  }

  swapHiddenChart(): void {
    if (!this.hiddenChart || this.charts.length < 2) return;
    const temp = this.charts[1];
    this.charts[1] = this.hiddenChart;
    this.hiddenChart = temp;
  }
}
