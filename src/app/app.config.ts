
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

const LOCAL_API_URL = 'http://127.0.0.1:8005/api/v1';
const RENDER_API_URL = 'https://jaen-eventos-backend.onrender.com/api/v1';

export const API_BASE_URL = isProduction()
  ? RENDER_API_URL
  : LOCAL_API_URL;

function isProduction(): boolean {
  return window.location.hostname !== 'localhost'
    && window.location.hostname !== '127.0.0.1';
}

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()]
};

