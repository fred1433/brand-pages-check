import Hero from './Hero.astro';
import Machine from './Machine.astro';
import Walls from './Walls.astro';
import Steps from './Steps.astro';
import Founders from './Founders.astro';
import Testimonials from './Testimonials.astro';
import Faq from './Faq.astro';
import LeadForm from './LeadForm.astro';

export const registry = {
  hero: Hero,
  machine: Machine,
  walls: Walls,
  steps: Steps,
  founders: Founders,
  testimonials: Testimonials,
  faq: Faq,
  'lead-form': LeadForm,
} as const;
