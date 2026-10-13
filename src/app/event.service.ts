import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { API_BASE_URL } from './app.config';
import { EventItem } from './event.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);

  getEvents(filters: { date?: string; from_date?: string; to_date?: string; category?: string; q?: string }): Observable<EventItem[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<EventItem[]>(`${API_BASE_URL}/events`, { params });
  }
}
