import { Injectable, EventEmitter, Output } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class LoaderService {
  @Output() loading = new EventEmitter();
  @Output() complete = new EventEmitter();

  constructor() { }

  emitLoading():void{
    this.loading.emit();
    //console.log("inside loader")
  }

  emitComplete():void{
    this.complete.emit();
  }
}
