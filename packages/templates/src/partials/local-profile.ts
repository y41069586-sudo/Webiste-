import { esc } from '../html';
import type { RenderContext } from '../types';

/** A composed factual panel when no licensed, relevant photo exists. Never invent a team/project. */
export function localProfile(
  { facts: f, parts: p, content: c }: Pick<RenderContext, 'facts' | 'parts' | 'content'>,
  style: 'workshop' | 'studio' = 'workshop',
) {
  const photos = p.photos(style === 'workshop' ? 2 : 1);
  if (photos.length)
    return `<div class="sw-photo-composition">${photos.map((photo) => p.figure(photo, 'w-full object-cover')).join('')}</div>${photos.some((photo) => photo.example) ? '<p class="sw-image-context">Illustrative Bildauswahl für diesen Entwurf · keine Aufnahmen des Betriebs.</p>' : ''}`;
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
    <a href="${p.draft ? '#oeffnungszeiten' : '#frage'}" class="sw-profile-contact">${p.draft ? 'Kontakt ansehen' : studio ? 'Eine Anfrage stellen' : 'Ihr Vorhaben anfragen'} <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
  </div>`;
}
