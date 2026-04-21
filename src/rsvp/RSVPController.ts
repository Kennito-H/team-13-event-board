import type { Request, Response } from 'express';
import type { RSVPService } from './RSVPService';
import type { AppSessionStore } from '../session/AppSession';
import { getAuthenticatedUser } from '../session/AppSession';
import { InvalidRSVPStateError } from './errors';

export class RSVPController {
  constructor(private rsvpService: RSVPService) {}

  async toggleRSVP(req: Request, res: Response, store: AppSessionStore): Promise<void> {
    const eventId = typeof req.params.eventId === 'string' ? req.params.eventId : '';
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.status(401).send('Authentication required');
      return;
    }

    const result = await this.rsvpService.toggleRSVP(eventId, currentUser.userId);

    if (result.ok === false) {
      const errorMessage = result.value.message;
      if (req.get('HX-Request') === 'true') {
        res.status(result.value instanceof InvalidRSVPStateError ? 400 : 404).render('partials/error', {
          message: errorMessage,
          layout: false,
        });
      } else {
        res.redirect(`/events/${eventId}?rsvpError=${encodeURIComponent(errorMessage)}`);
      }
      return;
    }
    
    

    // For HTMX requests return the button partial; otherwise redirect to the event page
    if (req.get('HX-Request') === 'true') {
      const htmxTarget = req.get('HX-Target') ?? '';
      const partial = htmxTarget.startsWith('rsvp-actions-')
        ? 'rsvp/partials/rsvp-actions'
        : 'rsvp/partials/rsvp-button';
      res.render(partial, {
        rsvp: result.value,
        eventId,
        layout: false,
      });
    } else {
        res.redirect(`/events/${eventId}`);
      }
  }
  

  async getMyRSVPs(req: Request, res: Response, store: AppSessionStore): Promise<void> {
    const currentUser = getAuthenticatedUser(store);

    if (!currentUser) {
      res.status(401).send('Authentication required');
      return;
    }

    const result = await this.rsvpService.getUserRSVPs(currentUser.userId);

    res.render('rsvp/my-rsvps', {
      rsvpsWithEvents: result.value,
      session: store.app,
    });
  }
}

export interface IRSVPController {
  toggleRSVP(req: Request, res: Response, store: AppSessionStore): Promise<void>;
  getMyRSVPs(req: Request, res: Response, store: AppSessionStore): Promise<void>;
}

export function CreateRSVPController(rsvpService: RSVPService): IRSVPController {
  return new RSVPController(rsvpService);
}