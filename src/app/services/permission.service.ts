import { Injectable } from '@angular/core';
import { LocalStorageService } from '../auth-services/local-storage.service';

export interface ModulePermission {
  has_add_permission: boolean;
  has_edit_permission: boolean;
  has_read_permission: boolean;
  has_delete_permission: boolean;
}

export interface RoleModule {
  module_name: string;
  permission: ModulePermission;
}

export interface RoleWithModules {
  id: number;
  name: string;
  modules: RoleModule[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private modules: RoleModule[] = [];

  constructor(private localStorageService: LocalStorageService) {
    this.loadModulesFromStorage();
  }

  /*Load role modules from local storage.Expects `roleModules` key to contain an array of RoleModule objects. */
  private loadModulesFromStorage(): void {
    try {
      const stored = this.localStorageService.get('roleModules');
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (Array.isArray(parsed)) {
          this.modules = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse roleModules from storage', e);
      this.modules = [];
    }
  }

  /*Public method to manually refresh modules from storage if needed.*/
  refreshModules(): void {
    this.loadModulesFromStorage();
  }

  /*Get permission object for a given module name. Example module names: "SYSTEM SETTINGS", "DASHBOARD", "BOOKINGS", etc.*/
  getModulePermission(moduleName: string): ModulePermission | null {
    // Always refresh from storage to ensure we have the latest permissions
    this.loadModulesFromStorage();
    const mod = this.modules.find(
      m => m.module_name?.toUpperCase() === moduleName.toUpperCase()
    );
    return mod?.permission ?? null;
  }

  hasReadPermission(moduleName: string): boolean {
    const perm = this.getModulePermission(moduleName);
    return perm?.has_read_permission ?? false;
  }

  hasAddPermission(moduleName: string): boolean {
    const perm = this.getModulePermission(moduleName);
    return perm?.has_add_permission ?? false;
  }

  hasEditPermission(moduleName: string): boolean {
    const perm = this.getModulePermission(moduleName);
    return perm?.has_edit_permission ?? false;
  }

  hasDeletePermission(moduleName: string): boolean {
    const perm = this.getModulePermission(moduleName);
    return perm?.has_delete_permission ?? false;
  }

  // Newly added for checking any permission
  hasAnyPermission(moduleName: string): boolean {
    const perm = this.getModulePermission(moduleName);
    return perm ? (
      perm.has_read_permission === true ||
      perm.has_add_permission === true ||
      perm.has_edit_permission === true ||
      perm.has_delete_permission === true
    ) : false;
  }
  // Ended for checking any permission
}


