import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { ENDPOINTS } from '../app.config';
import { AuthTokenService } from '../auth-services/auth-token.service';
import { Observable } from 'rxjs';
import { throwError } from 'rxjs';

// export interface HierarchyItem {
//   designation: string;
//   department: string;
//   escalationTime: number;
//   isTreeItem?: boolean;
//   parentId?: number;
//   id: number;
//   level?: number;
// }

export interface HierarchyItem {
  designation: string;
  department: string;
  escalationTime: number;
  isTreeItem?: boolean;
  parentId?: number;
  id: number;
  level?: number;
  isTopLevel?: boolean;
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
  ) { }

  // private getNextId(): number {
  //   return ++this.currentId;
  // }

  getNextId(): number {
    const data = this.hierarchyData.getValue() || [];
    if (!data.length) return 1;
    const maxId = Math.max(...data.map(item => item.id || 0));
    return maxId + 1;
  }

  setHierarchyData(data: HierarchyItem[], isTree: boolean = false, parentId?: number) {
    const currentData = this.hierarchyData.value;
    const normalizedParentId = (parentId === null || parentId === 0) ? undefined : parentId;
    const newData = data.map(item => ({
      ...item,
      isTreeItem: isTree,
      id: item.id ?? this.getNextId(),
      parentId: item.parentId ?? normalizedParentId
    }));
    // Merge without duplicates: replace if same id exists
    const merged = [...currentData];
    newData.forEach(item => {
      const idx = merged.findIndex(x => x.id === item.id);
      if (idx > -1) {
        merged[idx] = { ...merged[idx], ...item }; // update
      } else {
        merged.push(item); // insert
      }
    });
    this.hierarchyData.next(merged);
  }

  clearHierarchyData(): void {
    this.hierarchyData.next([]);
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

  addNewItem(item: HierarchyItem) {
    const current = this.hierarchyData.getValue();
    this.hierarchyData.next([...current, item]);
  }

}

