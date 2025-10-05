import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Trainee } from '../models/trainee';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private trainees: Trainee[] = [];

  private traineesSubject = new BehaviorSubject<Trainee[]>(this.trainees);
  trainees$ = this.traineesSubject.asObservable();

  getTrainees(): Trainee[] {
    return this.trainees;
  }

  addTrainee(newTrainee: Trainee): void {
    // Add a shallow copy to avoid accidental shared references
    this.trainees.unshift({ ...newTrainee });
    this.traineesSubject.next(this.trainees);
  }

  removeTrainee(id: number): void {
    this.trainees = this.trainees.filter(t => t.id !== id);
    this.traineesSubject.next(this.trainees);
  }

  updateTrainee(updatedTrainee: Trainee): void {
    const index = this.trainees.findIndex(t => t.id === updatedTrainee.id);
    if (index > -1) {
      this.trainees[index] = { ...updatedTrainee };
    } else {
      this.addTrainee(updatedTrainee);
    }
    this.traineesSubject.next(this.trainees);
  }

  /**
   * Replace a temporary trainee (identified by oldId) with the updated trainee.
   * If not found, just adds the updated trainee.
   */
  replaceTrainee(oldId: number, updatedTrainee: Trainee): void {
    const index = this.trainees.findIndex(t => t.id === oldId);
    if (index > -1) {
      this.trainees[index] = { ...updatedTrainee };
    } else {
      this.addTrainee(updatedTrainee);
    }
    this.traineesSubject.next(this.trainees);
  }
}
