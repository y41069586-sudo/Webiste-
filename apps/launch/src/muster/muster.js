// Gemeinsames Verhalten der SeitenWerk-Musterseiten (erfundene Betriebe).
// Buttons rufen niemanden an und senden nichts ab: Sie erklären, was auf einer echten Seite passiert.
(() => {
  const OUR_TEL = '+4915219682134';
  const OUR_TEL_TXT = '+49 1521 968 2134';
  const TEXT = {
    call: 'Auf Ihrer eigenen Seite startet dieser Button direkt einen Anruf bei Ihnen – ein Tipp, kein Abtippen.',
    form: 'Auf Ihrer eigenen Seite landet diese Anfrage sofort in Ihrem E-Mail-Postfach, mit allen Angaben des Kunden.',
    review: 'Auf Ihrer eigenen Seite führt dieser Link zu Ihren echten Google-Bewertungen. Wir erfinden keine Bewertungen.',
    map: 'Auf Ihrer eigenen Seite öffnet dieser Link die Route zu Ihrem Betrieb in Google Maps.',
    mail: 'Auf Ihrer eigenen Seite öffnet dieser Link eine E-Mail an Ihren Betrieb.',
    legal: 'Auf Ihrer eigenen Seite stehen hier Ihr Impressum und Ihre Datenschutzerklärung.',
  };

  const dlg = document.createElement('dialog');
  dlg.className = 'mdlg';
  dlg.innerHTML = `
    <form method="dialog" class="mdlg-in">
      <p class="mdlg-k">Musterseite</p>
      <h2 class="mdlg-h">Dieser Betrieb ist erfunden.</h2>
      <p class="mdlg-t" data-t></p>
      <p class="mdlg-t">Diese Seite zeigt, wie SeitenWerk arbeitet. Für Ihren Betrieb bauen wir den Entwurf kostenlos vorab.</p>
      <div class="mdlg-a">
        <a class="mdlg-b" href="tel:${OUR_TEL}">SeitenWerk anrufen: ${OUR_TEL_TXT}</a>
        <button class="mdlg-x" value="close">Weiter ansehen</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  const open = (kind) => {
    dlg.querySelector('[data-t]').textContent = TEXT[kind] || TEXT.form;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else alert('Musterseite: ' + (TEXT[kind] || TEXT.form));
  };
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-demo]');
    if (!el) return;
    e.preventDefault();
    open(el.getAttribute('data-demo'));
  });
  document.querySelectorAll('form[data-demo-form]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      open('form');
    }),
  );

  // Öffnungsstatus: data-hours='{"1":["07:00","17:00"],...}' (1 = Montag … 7 = Sonntag)
  document.querySelectorAll('[data-hours]').forEach((el) => {
    let h;
    try {
      h = JSON.parse(el.getAttribute('data-hours'));
    } catch {
      return;
    }
    const now = new Date();
    const day = now.getDay() || 7;
    const mins = now.getHours() * 60 + now.getMinutes();
    const toMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3);
    const names = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    const target = el.querySelector('[data-status-text]') || el;
    const today = h[day];
    if (today && mins >= toMin(today[0]) && mins < toMin(today[1])) {
      target.textContent = `Jetzt geöffnet · bis ${today[1]} Uhr`;
      el.dataset.state = 'open';
      return;
    }
    for (let i = 0; i < 8; i++) {
      const d = ((day - 1 + i) % 7) + 1;
      const t = h[d];
      if (!t) continue;
      if (i === 0 && mins >= toMin(t[0])) continue;
      target.textContent = `Gerade geschlossen · öffnet ${i === 0 ? 'heute' : i === 1 ? 'morgen' : names[d]} ${t[0]} Uhr`;
      el.dataset.state = 'closed';
      return;
    }
  });

  // Auswahl-Chips (Anfrage in Schritten)
  document.querySelectorAll('[data-chips]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      group.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  });

  // Preis-Rechner: <div data-calc data-prices='{"a|x":"ab 1.000 €"}'> mit Gruppen [data-calc-group] aus Buttons [data-val]
  document.querySelectorAll('[data-calc]').forEach((calc) => {
    let prices = {};
    try {
      prices = JSON.parse(calc.getAttribute('data-prices'));
    } catch {
      return;
    }
    const out = calc.querySelector('[data-calc-out]');
    const update = () => {
      const key = [...calc.querySelectorAll('[data-calc-group]')]
        .map((g) => g.querySelector('[aria-pressed="true"]')?.dataset.val || '')
        .join('|');
      if (out && prices[key]) out.textContent = prices[key];
    };
    calc.querySelectorAll('[data-calc-group]').forEach((g) =>
      g.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-val]');
        if (!b) return;
        g.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        update();
      }),
    );
    update();
  });
})();
