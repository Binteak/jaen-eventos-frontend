
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';

import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

import { EventService } from './event.service';
import { EventItem } from './event.model';

// Permite acceder al procesador oficial de publicaciones incrustadas de Instagram.
declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly eventService = inject(EventService);

  @ViewChild('mapElement')
  mapElement?: ElementRef<HTMLDivElement>;

  events: EventItem[] = [];
  filteredEvents: EventItem[] = [];

  selectedDate = this.localDateString(new Date());
  selectedCategory = 'todos';
  searchText = '';

  loading = true;
  apiError = false;

  selectedEventId: number | null = null;

  map?: L.Map;
  markers = new Map<number, L.Marker>();

  categories = [
    { value: 'todos', label: 'Todos' },
    { value: 'musica', label: 'Música' },
    { value: 'cultura', label: 'Cultura' },
    { value: 'deporte', label: 'Deporte' },
    { value: 'familia', label: 'Familia' },
    { value: 'otros', label: 'Otros' }
  ];

  dateOptions = this.makeDateOptions();

  ngOnInit(): void {
    this.loadEvents();
  }

  ngAfterViewInit(): void {
    if (!this.mapElement) {
      return;
    }

    // Configuración de los iconos de Leaflet.
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });

    // Inicialización del mapa centrado en Jaén.
    this.map = L.map(this.mapElement.nativeElement, {
      zoomControl: true
    }).setView([37.765, -3.790], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
    }).addTo(this.map);

    this.refreshMarkers();

    // Ajusta el mapa cuando el contenedor ya está visible.
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }


 

private createEventIcon(selected = false): L.DivIcon {
  return L.divIcon({
    className: 'jaen-map-marker-container',
    html: `
      <div class="jaen-map-marker ${selected ? 'marker-selected' : ''}">
        <span class="marker-halo"></span>
        <span class="marker-pin">
          <span class="marker-center"></span>
        </span>
      </div>
    `,
    iconSize: [44, 54],
    iconAnchor: [22, 48],
    popupAnchor: [0, -46]
  });
}

private updateSelectedMarker(): void {
  this.markers.forEach((marker, eventId) => {
    marker.setIcon(
      this.createEventIcon(eventId === this.selectedEventId)
    );
  });
}

  /**
   * Obtiene los eventos de la API y procesa las publicaciones
   * de Instagram después de actualizar la vista.
   */
  loadEvents(): void {
    this.loading = true;
    this.apiError = false;

    this.eventService
      .getEvents({
        date: this.selectedDate,
        category: this.selectedCategory,
        q: this.searchText.trim()
      })
      .subscribe({
        next: (events: EventItem[]) => {
          this.events = events;
          this.filteredEvents = events;
          this.loading = false;

          this.refreshMarkers();

          // Espera a que Angular actualice las tarjetas
          // y después solicita a Instagram que procese los embeds.
          this.processInstagramEmbeds();
        },

        error: () => {
          this.events = [];
          this.filteredEvents = [];
          this.apiError = true;
          this.loading = false;

          this.refreshMarkers();
        }
      });
  }

  

  /**
   * Procesa los bloques de Instagram presentes en el HTML.
   * Es necesario porque Angular crea las tarjetas dinámicamente.
   */
  private processInstagramEmbeds(): void {
    setTimeout(() => {
      window.instgrm?.Embeds?.process();
    }, 0);
  }

  chooseDate(date: string): void {
    this.selectedDate = date;
    this.loadEvents();
  }

  chooseCategory(category: string): void {
    this.selectedCategory = category;
    this.loadEvents();
  }

  search(): void {
    this.loadEvents();
  }

  resetFilters(): void {
    this.selectedCategory = 'todos';
    this.searchText = '';
    this.selectedDate = this.localDateString(new Date());

    this.loadEvents();
  }

  /**
   * Selecciona un evento y centra el mapa en su marcador,
   * si dispone de coordenadas.
   */
  selectEvent(event: EventItem): void {
    this.selectedEventId = event.id;

    const marker = this.markers.get(event.id);

    if (marker && this.map) {
      this.map.setView(marker.getLatLng(), 15, {
        animate: true
      });

      marker.openPopup();
    }
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid'
    }).format(new Date(value));
  }

  categoryLabel(category: string): string {
    return (
      this.categories.find((item) => item.value === category)?.label ??
      'Otros'
    );
  }

  trackById(_index: number, item: EventItem): number {
    return item.id;
  }

  /**
   * Elimina los marcadores anteriores y crea los nuevos
   * a partir de las coordenadas de los eventos filtrados.
   */

  private refreshMarkers(): void {
  if (!this.map) {
    return;
  }

  this.markers.forEach((marker) => marker.remove());
  this.markers.clear();

  this.filteredEvents
    .filter(
      (event) =>
        event.latitude != null &&
        event.longitude != null
    )
    .forEach((event) => {
      const marker = L.marker(
        [
          event.latitude as number,
          event.longitude as number
        ],
        {
          icon: this.createEventIcon(
            this.selectedEventId === event.id
          ),
          keyboard: true,
          title: event.title,
          alt: event.title,
          riseOnHover: true
        }
      );

      marker.bindPopup(
        `<strong>${this.escapeHtml(event.title)}</strong><br>` +
        `${this.escapeHtml(event.venue ?? event.address ?? 'Jaén')}`
      );

      marker.on('click', () => {
        this.selectedEventId = event.id;
        this.updateSelectedMarker();
      });

      marker.addTo(this.map as L.Map);
      this.markers.set(event.id, marker);
    });
}
  /**
   * Evita que los textos de los eventos se interpreten
   * como HTML dentro de las ventanas emergentes del mapa.
   */
  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const replacements: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };

      return replacements[character] ?? character;
    });
  }

  private localDateString(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private makeDateOptions(): {
    value: string;
    weekday: string;
    day: string;
    month: string;
    label: string;
  }[] {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() + index);

      const value = this.localDateString(date);

      const parts = new Intl.DateTimeFormat('es-ES', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      }).formatToParts(date);

      const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? '';

      return {
        value,
        weekday:
          index === 0
            ? 'Hoy'
            : index === 1
              ? 'Mañana'
              : part('weekday').replace('.', ''),
        day: part('day'),
        month: part('month').replace('.', ''),
        label: value
      };
    });
  }
}