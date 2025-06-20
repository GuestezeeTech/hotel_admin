import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { Observable } from 'rxjs';
import { throwError } from 'rxjs';

export interface HierarchyItem {
  designation: string;
  department: string;
  escalationTime: number;
  isTreeItem?: boolean;
  parentId?: number;
  id: number;
  level?: number;
}

@Injectable({
  providedIn: 'root'
})

export class HierarchyService {
  private hierarchyData = new BehaviorSubject<HierarchyItem[]>([]);
  hierarchyData$ = this.hierarchyData.asObservable();
  private currentId = 0;

  constructor(
    private http: HttpClient,
    private authTokenService: AuthTokenService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Removed test data
  }

  private getNextId(): number {
    //console.log(++this.currentId, " ++this.currentId")
    return ++this.currentId;
  }

  setHierarchyData(data: HierarchyItem[], isTree: boolean = false, parentId?: number) {
    const currentData = this.hierarchyData.value;

      // Update currentId to max existing ID before adding new data
  const maxCurrentId = currentData.reduce((maxId, item) => Math.max(maxId, item.id), 0);
   
  if (maxCurrentId > this.currentId) {
    this.currentId = maxCurrentId;
    //console.log(  this.currentId,"  this.currentId")
  }
    
    // Normalize parentId for root items
    const normalizedParentId = (parentId === null || parentId === 0) ? undefined : parentId;
    // Always add new data at the end
    const newData = data.map(item => ({
      ...item,
      isTreeItem: isTree,
      id:item.id !== undefined ? item.id : this.getNextId(),
      parentId: item.parentId !== undefined ? item.parentId : normalizedParentId

    }));
      const editId = newData.reduce((maxId, item) => Math.max(maxId, item.id), 0);
        this.currentId = editId;

if(currentData.length==0||currentData.length==undefined ){
    //console.log('[setHierarchyData] Adding new data:', newData);
    //console.log('[setHierarchyData] Adding new data:',  this.currentId);

}
  
    // Simply append the new data to the existing data
    this.hierarchyData.next([...currentData, ...newData]);
  }

  clearHierarchyData(): void {
    this.hierarchyData.next([]); // Clears all hierarchy items
  }

  getHierarchyData(): HierarchyItem[] {
    return this.hierarchyData.value;
  }

  apiCall(Obj: any, endpointUrl: string): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate(['/login'], { skipLocationChange: false });
      return new Observable(); // Consider replacing with EMPTY or throwError as noted earlier
    } else {
      const headers = new HttpHeaders()
        .set('Content-Type', 'application/json')
        .set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken());

      return this.http.post(endpointUrl, Obj, { headers });
    }
  }


  // Newly added
  updateHierarchy(UpdateCustomerObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
      this.router.navigate([`/login`], { skipLocationChange: false });
      return new Observable();
    }
    else {
      return this.http.post(ENDPOINTS.UPDATE_HIERARCHY, UpdateCustomerObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
  }

  getAllHierarchy(jsonObj: any): Observable<any> {
    if (this.authTokenService.isTokenExpired()) {
        this.router.navigate([`/login`], { skipLocationChange: false });
        return new Observable();
    }
    else {
        return this.http.post(ENDPOINTS.GET_HIERARCHY, jsonObj, { headers: new HttpHeaders().set('Content-Type', 'application/json').set('authorization', 'Bearer ' + this.authTokenService.getAccessAPIToken()) });
    }
}
}
