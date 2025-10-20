import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NgForm, FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { Trainee } from '../../models/trainee';
import { IsraeliIdValidatorDirective } from '../../validators/israeli-id.directive';

@Component({ 
  selector: 'app-trainee-details-dialog', 
  standalone: true, 
  templateUrl: './trainee-details-dialog.component.html',
  styleUrls: ['./trainee-details-dialog.component.scss'],
  imports: [ 
    FormsModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatButtonModule, 
    MatDialogModule, 
    NgIf,
    IsraeliIdValidatorDirective
  ],
})
export class TraineeDetailsDialogComponent { 
  trainee: Trainee; 
  isNew: boolean; 

  constructor( 
    public dialogRef: MatDialogRef<TraineeDetailsDialogComponent>, 
    @Inject(MAT_DIALOG_DATA) public data: { trainee: Trainee; isNew: boolean } 
  ) { 
    this.trainee = { ...data.trainee }; 
    this.isNew = data.isNew; 
  } 

  todayDate(): string { 
    return new Date().toISOString().split('T')[0]; 
  } 

  /** Save trainee and close dialog, applying grade limits */
  saveTrainee(form: NgForm) { 
    if (!form.valid) return;

    // Clamp grade between 0 and 100
    this.trainee.grade = Math.min(Math.max(this.trainee.grade, 0), 100);

    // Clean up optional fields - convert empty strings to undefined
    if (!this.trainee.email?.trim()) this.trainee.email = undefined;
    if (!this.trainee.dateJoined?.trim()) this.trainee.dateJoined = undefined;
    if (!this.trainee.address?.trim()) this.trainee.address = undefined;
    if (!this.trainee.city?.trim()) this.trainee.city = undefined;
    if (!this.trainee.country?.trim()) this.trainee.country = undefined;
    if (!this.trainee.zip?.trim()) this.trainee.zip = undefined;

    // Close dialog with the trainee object (caller decides add/update)
    this.dialogRef.close(this.trainee);
  } 

  /** Cancel editing and close dialog without returning trainee */
  cancel() { 
    this.dialogRef.close(null);
  }
}
