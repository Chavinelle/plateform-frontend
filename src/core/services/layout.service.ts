import { Injectable, signal } from '@angular/core';

/**
 * État de la mise en page : panneau latéral ouvert ou fermé sur petit écran
 * (sur grand écran, la barre latérale est toujours visible).
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly _sidebarOpen = signal(false);
  readonly sidebarOpen = this._sidebarOpen.asReadonly();

  openSidebar() { this._sidebarOpen.set(true); }
  closeSidebar() { this._sidebarOpen.set(false); }
  toggleSidebar() { this._sidebarOpen.update(open => !open); }
}
