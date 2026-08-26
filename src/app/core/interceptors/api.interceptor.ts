import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  // Verificamos si la solicitud es hacia nuestras APIs internas (comienzan con /api/ o /auth/ u otros módulos)
  if (req.url.startsWith('/api') || req.url.startsWith('/auth') || req.url.startsWith('/turn-board-websocket')) {
    const apiReq = req.clone({ url: `${environment.apiUrl}${req.url}` });
    return next(apiReq);
  }
  return next(req);
};
