import { TaskManagementComponent } from './task-management.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CreateTaskComponent } from './create-task/create-task.component';

const routes: Routes = [
  { path: 'task-management', component: TaskManagementComponent },
  // For create task
  { path: 'task-management/create-task', component: CreateTaskComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class TaskManagemnetRoutingModule { }