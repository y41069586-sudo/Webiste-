import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Schriften der Gestaltungs-Kits (alle SIL Open Font License 1.1, über @fontsource bezogen, siehe
 * assets/fonts/kits/LIZENZEN.txt). Eingebettet als data:-URI: Demos laden nichts von fremden Servern (DSGVO,
 * LG München I 3 O 17493/20) und funktionieren als einzelne HTML-Datei.
 */
export type KitDisplayFont = 'archivo' | 'bodoni' | 'gloock';
export type KitTextFont = 'atkinson' | 'karla';

const FILES: Record<
  KitDisplayFont | KitTextFont,
  { family: string; faces: { file: string; weight: string; stretch?: string }[] }
> = {
  archivo: { family: 'Kit Archivo', faces: [{ file: 'archivo.woff2', weight: '100 900', stretch: '62% 125%' }] },
  bodoni: { family: 'Kit Bodoni', faces: [{ file: 'bodoni.woff2', weight: '400 900' }] },
  gloock: { family: 'Kit Gloock', faces: [{ file: 'gloock.woff2', weight: '400' }] },
  atkinson: {
    family: 'Kit Atkinson',
    faces: [
      { file: 'atkinson-400.woff2', weight: '400' },
      { file: 'atkinson-700.woff2', weight: '700' },
    ],
  },
  karla: { family: 'Kit Karla', faces: [{ file: 'karla.woff2', weight: '200 800' }] },
};

export function kitFontsDir(): string {
  if (process.env.TEMPLATES_KIT_FONTS_DIR) return process.env.TEMPLATES_KIT_FONTS_DIR;
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', '..', 'assets', 'fonts', 'kits');
}

const cache = new Map<string, string>();

export function kitFontFamily(font: KitDisplayFont | KitTextFont): string {
  return FILES[font].family;
}

/** @font-face-Regeln für genau die Schriften eines Kits (nur diese werden eingebettet). */
export function kitFontCss(fonts: (KitDisplayFont | KitTextFont)[]): string {
  return [...new Set(fonts)]
    .map((font) => {
      const def = FILES[font];
      return def.faces
        .map((face) => {
          let uri = cache.get(face.file);
          if (!uri) {
            uri = `data:font/woff2;base64,${readFileSync(path.join(kitFontsDir(), face.file)).toString('base64')}`;
            cache.set(face.file, uri);
          }
          return `@font-face{font-family:'${def.family}';src:url(${uri}) format('woff2');font-weight:${face.weight};${face.stretch ? `font-stretch:${face.stretch};` : ''}font-style:normal;font-display:swap}`;
        })
        .join('');
    })
    .join('');
}
