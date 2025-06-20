import { Injectable } from '@angular/core';
import { LocalStorageService } from '../auth-services/local-storage.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class UserAccessService {
    private userAccessSubject = new BehaviorSubject<any>(null);
    userAccess$ = this.userAccessSubject.asObservable();
    userAccessList = {
        DASHBOARD: {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: false,
            has_delete_permission: false
        },
        CUSTOMERS: {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: false,
            has_delete_permission: false
        },
        PAYMENT: {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: false,
            has_delete_permission: false
        },
        SYSTEMSETTINGS: {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: false,
            has_delete_permission: false
        },
        MARKETING: {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: false,
            has_delete_permission: false
        },
        USERACCESS: {
            has_add_permission: false,
            has_edit_permission: false,
            has_read_permission: false,
            has_delete_permission: false
        }
    }

    constructor(
        private localStorageService: LocalStorageService
    ) { }

    setUserAccess(userAccessObj: any) {
        this.localStorageService.set("USERACCESS", JSON.stringify(userAccessObj));
        this.userAccessSubject.next(userAccessObj); // 🚨 This notifies all subscribers
    }

    getUserAccess() {
        const userAccess = this.localStorageService.get("USERACCESS");
        if (userAccess) {
            return JSON.parse(userAccess);
        } else {
            return null;
        }
    }

    removeUserAccess() {
        if (this.localStorageService.get("USERACCESS")) {
            this.localStorageService.remove("USERACCESS")
        }
    }
}
