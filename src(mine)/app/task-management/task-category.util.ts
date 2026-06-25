// Common helper for deciding if we should filter tasks by service.category
// Logic is aligned with login.component.ts -> getAllStaffIds()
export function shouldFilterByCategory(department: any): boolean {
  return Array.isArray(department)
    ? !department.includes('Default')
    : department !== 'Default' && !!department;
}


