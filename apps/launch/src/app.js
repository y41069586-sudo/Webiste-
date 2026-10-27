// SeitenWerk Launch – Bühnenanimation, Einblendungen, FAQ und Anfrageformular. Ohne Abhängigkeiten, ohne Tracking.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Einblendungen beim Scrollen ---------- */
  const reveals = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('in'));

  /* ---------- FAQ: immer nur eine Antwort offen ---------- */
  const details = $$('.faq-list details');
  details.forEach((d) =>
    d.addEventListener('toggle', () => {
      if (d.open) details.forEach((o) => o !== d && (o.open = false));
    }),
  );

  /* ---------- Bühne: Eintrag fliegt Stück für Stück ins Handy ---------- */
  const BUSINESSES = [
    {
      slug: 'malerei-muster',
      name: 'Malerei Muster',
      meta: 'Malerbetrieb · Musterstadt',
      kicker: 'MALERBETRIEB · MUSTERSTADT',
      claim: 'Innen- und Außenanstrich, sauber geplant.',
      chips: ['Innenanstrich', 'Fassade', 'Tapezieren'],
      hours: '07:30 – 16:30',
      photo: '/img/foto-maler.webp',
    },
    {
      slug: 'reinigung-muster',
      name: 'Reinigung Muster',
      meta: 'Gebäudereinigung · Musterstadt',
      kicker: 'GEBÄUDEREINIGUNG · MUSTERSTADT',
      claim: 'Büro, Treppenhaus und Glas – planbar sauber.',
      chips: ['Unterhaltsreinigung', 'Glas', 'Treppenhaus'],
      hours: '06:00 – 18:00',
      photo: '/img/foto-reinigung.webp',
    },
    {
      slug: 'fliesen-muster',
      name: 'Fliesen Muster',
      meta: 'Fliesenleger · Musterstadt',
      kicker: 'FLIESENLEGER · MUSTERSTADT',
      claim: 'Bad, Küche und Boden – Fuge für Fuge.',
      chips: ['Badsanierung', 'Bodenfliesen', 'Naturstein'],
      hours: '08:00 – 17:00',
      photo: '/img/foto-fliesen.webp',
    },
  ];

  const stage = $('[data-stage]');
  if (stage) runStage(stage);

  function runStage(stage) {
    const el = (name) => $(`[data-${name}]`, stage);
    const mini = el('mini');
    const screen = $('.screen', stage);
    const flyer = el('flyer');
    const trail = el('trail');
    const live = el('live');
    const parts = (name) => $$(`[data-part="${name}"]`, stage);
    const item = (name) => $(`[data-item="${name}"]`, stage);
    BUSINESSES.forEach((b) => (new Image().src = b.photo));

    let visible = true;
    if ('IntersectionObserver' in window)
      new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.05 }).observe(stage);
    const active = () => visible && !document.hidden;
    const wait = async (ms) => {
      await new Promise((r) => setTimeout(r, ms));
      while (!active()) await new Promise((r) => setTimeout(r, 400));
    };

    function fill(b) {
      el('l-photo').style.backgroundImage = `url(${b.photo})`;
      el('l-name').textContent = b.name;
      el('l-meta').textContent = b.meta;
      el('url').textContent = b.slug;
      el('m-photo').src = b.photo;
      el('m-brand').textContent = b.name;
      el('m-kicker').textContent = b.kicker;
      el('m-name').textContent = b.name;
      el('m-claim').textContent = b.claim;
      el('m-chips').replaceChildren(
        ...b.chips.map((c) => {
          const n = document.createElement('b');
          n.textContent = c;
          return n;
        }),
      );
      el('m-hours').textContent = b.hours;
      el('cap').textContent = b.name;
    }

    function reset() {
      $$('.sk', stage).forEach((n) => n.classList.remove('on'));
      $$('.hot', stage).forEach((n) => n.classList.remove('hot'));
      mini.classList.remove('s-photo');
      mini.style.transform = '';
      live.classList.remove('on');
    }

    if (reduce) {
      fill(BUSINESSES[0]);
      $$('.sk', stage).forEach((n) => n.classList.add('on'));
      mini.classList.add('s-photo');
      live.classList.add('on');
      return;
    }

    // Mittelpunkt eines Elements in Bühnenkoordinaten (inklusive Schwebe-Animation)
    function center(node) {
      const s = stage.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top + r.height / 2 };
    }

    async function fly(from, to, label) {
      const a = center(from);
      const b = center(to);
      const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 70 };
      trail.setAttribute('d', `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`);
      const len = trail.getTotalLength();
      trail.animate(
        [
          { opacity: 0, strokeDashoffset: len },
          { opacity: 0.9, offset: 0.25 },
          { opacity: 0.9, strokeDashoffset: 0, offset: 0.8 },
          { opacity: 0, strokeDashoffset: 0 },
        ],
        { duration: 750, easing: 'ease-out' },
      );
      flyer.textContent = label;
      const w = flyer.offsetWidth;
      const h = flyer.offsetHeight;
      const frames = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t ** 2 * b.x;
        const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t ** 2 * b.y;
        frames.push({
          transform: `translate(${x - w / 2}px, ${y - h / 2}px) scale(${1 - 0.25 * t})`,
          opacity: i === 0 ? 0 : i === 16 ? 0 : 1,
        });
      }
      await flyer.animate(frames, { duration: 620, easing: 'cubic-bezier(.5,0,.3,1)' }).finished;
    }

    const STEPS = [
      { from: () => el('l-photo'), label: 'Foto', part: 'foto', then: () => mini.classList.add('s-photo') },
      { from: () => item('leistungen'), label: 'Leistungen', part: 'leistungen' },
      { from: () => item('zeiten'), label: 'Öffnungszeiten', part: 'zeiten' },
      { from: () => item('adresse'), label: 'Adresse', part: 'adresse', scroll: true },
      { from: () => item('telefon'), label: 'Telefon', to: () => $('.mini-top i', stage), top: true },
    ];

    function scrollTo(node) {
      // Handy-Inhalt so weit hochschieben, dass der Kartenabschnitt sichtbar ist
      const room = screen.clientHeight - 70;
      const bottom = node.offsetTop + node.offsetHeight + 16;
      mini.style.transform = `translateY(${-Math.max(0, bottom - room)}px)`;
    }

    (async () => {
      let i = 0;
      fill(BUSINESSES[0]);
      await wait(250);
      for (;;) {
        for (const step of STEPS) {
          const src = step.from();
          const target = step.to ? step.to() : parts(step.part)[0];
          if (step.scroll) {
            scrollTo(target);
            await wait(380);
          }
          if (step.top) {
            mini.style.transform = '';
            await wait(380);
          }
          src.classList.add('hot');
          await wait(160);
          await fly(src, target, step.label);
          if (step.part) parts(step.part).forEach((n) => n.classList.add('on'));
          step.then?.();
          src.classList.remove('hot');
          await wait(180);
        }
        live.classList.add('on');
        await wait(2200);
        i = (i + 1) % BUSINESSES.length;
        reset();
        stage.animate([{ opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }], { duration: 500 });
        await wait(250);
        fill(BUSINESSES[i]);
        await wait(400);
      }
    })();
  }

  /* ---------- Anfrageformular (Netlify Forms) ---------- */
  const mail = document.body.dataset.mail || '';
  const MESSAGES = {
    betrieb: 'Bitte nennen Sie den Namen Ihres Betriebs.',
    ort: 'Bitte nennen Sie den Ort.',
    email: 'Bitte geben Sie eine gültige E-Mail-Adresse an.',
    einwilligung: 'Bitte bestätigen Sie die Angaben zu Unternehmer und Datenschutz.',
  };

  $$('form[data-request]').forEach((form) => {
    const error = $('.form-error', form);
    const button = $('button[type="submit"]', form);
    const holder = form.closest('.hb-formwrap, .card');
    form.addEventListener('input', () => (error.textContent = ''));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const invalid = $$('input[required]', form).find((input) => !input.checkValidity() || !input.value.trim());
      if (invalid) {
        error.textContent = MESSAGES[invalid.name] || 'Bitte prüfen Sie Ihre Angaben.';
        invalid.focus();
        return;
      }
      button.disabled = true;
      const label = button.textContent;
      button.textContent = 'Wird gesendet …';
      try {
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        if (!response.ok) throw new Error(String(response.status));
        holder.classList.add('sent');
        form.reset();
        $('.done', holder)?.focus?.();
      } catch {
        error.textContent = mail
          ? `Das Senden hat nicht geklappt. Bitte versuchen Sie es noch einmal oder schreiben Sie an ${mail}.`
          : 'Das Senden hat nicht geklappt. Bitte versuchen Sie es noch einmal.';
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  });
})();
