import { esc } from '../html';
import type { RenderContext } from '../types';

/** A composed factual panel when no licensed, relevant photo exists. Never invent a team/project. */
export function localProfile(
  { facts: f, parts: p, content: c }: Pick<RenderContext, 'facts' | 'parts' | 'content'>,
  style: 'workshop' | 'studio' = 'workshop',
) {
  const photo = p.photos(1)[0];
  if (photo) return p.figure(photo, 'h-full min-h-72 w-full object-cover', 'overflow-hidden rounded-2xl');
  const studio = style === 'studio';
  return `<div class="sw-local-profile ${studio ? 'sw-local-profile-studio' : ''}">
    <p class="sw-profile-eyebrow">${esc(f.branchLabel)} · ${esc(f.city)}</p>
    <p class="sw-profile-name">${esc(f.name)}</p>
    <p class="sw-profile-address">${p.addressLines}</p>
    <div class="sw-profile-offer">${p.servicesNote('sw-profile-note')}<ul>${c.services
      .slice(0, 3)
      .map(
        (s, index) =>
          `<li><span class="sw-profile-index" aria-hidden="true">0${index + 1}</span><div><strong>${esc(s.title)}</strong><p>${esc(s.text)}</p></div></li>`,
      )
      .join('')}</ul></div>
    <a href="#frage" class="sw-profile-contact">${studio ? 'Eine Anfrage stellen' : 'Ihr Vorhaben anfragen'} <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
  </div>`;
}
