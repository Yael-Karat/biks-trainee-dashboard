import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Trainee } from '../models/trainee';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private trainees: Trainee[] = [
    { id: 1, name: 'Alice Cohen', subject: 'Math', grade: 78, date: '2025-09-20' },
    { id: 2, name: 'David Levi', subject: 'English', grade: 85, date: '2025-09-21' },
    { id: 3, name: 'Noa Ben', subject: 'History', grade: 62, date: '2025-09-22' },
    { id: 4, name: 'Eli Katz', subject: 'Science', grade: 90, date: '2025-09-23' },
    { id: 5, name: 'Dana Mizrahi', subject: 'Physics', grade: 55, date: '2025-09-24' },
    { id: 6, name: 'Ron Shalev', subject: 'Math', grade: 71, date: '2025-09-25' },
    { id: 7, name: 'Gal Sharon', subject: 'Chemistry', grade: 95, date: '2025-09-26' },
    { id: 8, name: 'Shira Cohen', subject: 'English', grade: 66, date: '2025-09-27' },
    { id: 9, name: 'Avi Peretz', subject: 'Biology', grade: 82, date: '2025-09-28' },
    { id: 10, name: 'Yael Karat', subject: 'Math', grade: 100, date: '2025-09-29' },
    { id: 11, name: 'Tom Levi', subject: 'History', grade: 59, date: '2025-09-30' },
  ];

  private traineesSubject = new BehaviorSubject<Trainee[]>(this.trainees);
  trainees$ = this.traineesSubject.asObservable();

  getTrainees(): Trainee[] {
    return this.trainees;
  }

  addTrainee(newTrainee: Trainee): void {
    this.trainees.push(newTrainee);
    this.traineesSubject.next(this.trainees);
  }

  removeTrainee(id: number): void {
    this.trainees = this.trainees.filter(t => t.id !== id);
    this.traineesSubject.next(this.trainees);
  }
}
