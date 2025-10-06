import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { BaseChartDirective } from 'ng2-charts';

import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

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
  traineeNames: string[] = [];
  subjects: string[] = [];

  selectedTrainees: string[] = [];
  selectedSubjects: string[] = [];

  charts: any[] = [];
  hiddenChart: any;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.trainees$.subscribe(data => {
      this.trainees = data;

      // Unique trainee names
      this.traineeNames = Array.from(new Set(data.map(t => t.name)));

      // Unique subjects
      this.subjects = Array.from(new Set(data.map(t => t.subject)));

      this.updateCharts();
    });
  }

  updateCharts(): void {
    const filteredTrainees = this.selectedTrainees.length
      ? this.trainees.filter(t => this.selectedTrainees.includes(t.name))
      : this.trainees;

    const filteredSubjects = this.selectedSubjects.length
      ? this.selectedSubjects
      : this.subjects;

    // Chart 1: Average grade per trainee
    const chart1Data = this.traineeNames
      .filter(name => !this.selectedTrainees.length || this.selectedTrainees.includes(name))
      .map(name => {
        const grades = filteredTrainees
          .filter(t => t.name === name && filteredSubjects.includes(t.subject))
          .map(t => t.grade);
        const avg = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
        return { name, avg };
      });

    // Chart 2: Average grade per subject
    const chart2Data = filteredSubjects.map(subject => {
      const grades = filteredTrainees.filter(t => t.subject === subject).map(t => t.grade);
      return grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
    });

    this.charts = [
      {
        type: 'bar',
        labels: chart1Data.map(c => c.name),
        data: chart1Data.map(c => c.avg),
        options: { responsive: true, plugins: { legend: { display: false } } }
      },
      {
        type: 'line',
        labels: filteredSubjects,
        data: chart2Data,
        options: { responsive: true }
      }
    ];

    // Hidden chart (pie)
    this.hiddenChart = {
      type: 'pie',
      labels: filteredSubjects,
      data: chart2Data,
      options: { responsive: true }
    };
  }

  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.charts, event.previousIndex, event.currentIndex);
  }

  swapHiddenChart() {
    if (!this.hiddenChart || this.charts.length < 2) return;
    const temp = this.charts[1];
    this.charts[1] = this.hiddenChart;
    this.hiddenChart = temp;
  }
}
