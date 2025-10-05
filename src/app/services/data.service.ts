import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Trainee } from '../models/trainee';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private STORAGE_KEY = 'trainees';
  private trainees: Trainee[] = [];

  private traineesSubject = new BehaviorSubject<Trainee[]>(this.trainees);
  trainees$ = this.traineesSubject.asObservable();

  constructor() {
    // Load from localStorage on init
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.trainees = JSON.parse(saved) as Trainee[];
        this.traineesSubject.next(this.trainees);
      } catch {
        this.trainees = [];
        this.saveToStorage();
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.trainees));
  }

  getTrainees(): Trainee[] {
    return this.trainees;
  }

  addTrainee(newTrainee: Trainee): void {
    this.trainees.unshift({ ...newTrainee });
    this.traineesSubject.next(this.trainees);
    this.saveToStorage();
  }

  removeTrainee(id: number): void {
    this.trainees = this.trainees.filter(t => t.id !== id);
    this.traineesSubject.next(this.trainees);
    this.saveToStorage();
  }

  updateTrainee(updatedTrainee: Trainee): void {
    const index = this.trainees.findIndex(t => t.id === updatedTrainee.id);
    if (index > -1) {
      this.trainees[index] = { ...updatedTrainee };
    } else {
      this.addTrainee(updatedTrainee);
      return;
    }
    this.traineesSubject.next(this.trainees);
    this.saveToStorage();
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
      return;
    }
    this.traineesSubject.next(this.trainees);
    this.saveToStorage();
  }
}
