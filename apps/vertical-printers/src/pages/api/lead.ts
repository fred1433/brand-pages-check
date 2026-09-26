import type { APIRoute } from 'astro';
import brand from '@brands/vertical-printers/brand.config.json';
import { handleLead } from '@shared/forms/handler';

export const prerender = false;

// VERCEL_ENV is set by Vercel on each deployment; the browser cannot influence it.
export const POST: APIRoute = ({ request }) => handleLead({ brand, request, vercelEnv: process.env.VERCEL_ENV });
