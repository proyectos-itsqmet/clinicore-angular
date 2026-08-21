import type { NavLink } from './shared.model';

export interface SiteBrand {
  name: string;
}

export interface SiteContact {
  phone: string;
  emergencyPhone: string;
  whatsapp: string;
  email: string;
}

export interface SiteNav {
  primary: NavLink[];
}

export interface SiteMedicalDirector {
  label: string;
  name: string;
  registrationNumber: string;
}

export interface SiteFooter {
  description: string;
  medicalDirector: SiteMedicalDirector;
  specialtyLinks: NavLink[];
  patientLinks: NavLink[];
  legalLinks: NavLink[];
}

export interface SiteLegal {
  disclaimer: string;
  copyright: string;
}

/**
 * GET /api/landing/site — brand, contact, nav and footer. Static, cacheable
 * shell content (see jsons/landing/README.md).
 */
export interface Site {
  brand: SiteBrand;
  contact: SiteContact;
  nav: SiteNav;
  footer: SiteFooter;
  legal: SiteLegal;
}
