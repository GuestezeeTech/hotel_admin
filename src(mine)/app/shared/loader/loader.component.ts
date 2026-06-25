import { Component, OnInit } from '@angular/core';
import { LoaderService } from './loader.service';

@Component({
  selector: 'app-loader',
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss']
})

export class LoaderComponent implements OnInit {
  isLoading:boolean =false;

  constructor(private loaderService:LoaderService) { }

  ngOnInit(): void {
    this.loaderService.loading.subscribe(() => {
      this.isLoading = true;
    })
    this.loaderService.complete.subscribe(() => {
      this.isLoading = false;
    })
  }
}