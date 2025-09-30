import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { DataService } from '../../services/data.service';
import { Trainee } from '../../models/trainee';
import { MatCard } from "@angular/material/card";
import { MaterialModule } from "../../material/material.module";

@Component({
  selector: 'app-data',
  templateUrl: './data.component.html',
  styleUrls: ['./data.component.scss'],
  imports: [MatCard, MaterialModule]
})
export class DataComponent implements OnInit {
  displayedColumns: string[] = ['id', 'name', 'date', 'grade', 'subject'];
  dataSource = new MatTableDataSource<Trainee>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataSource.data = this.dataService.getTrainees();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }
}
