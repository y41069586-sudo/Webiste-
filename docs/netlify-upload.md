# Firmenwebsite auf dem bestehenden Netlify-Projekt veröffentlichen

Bestehendes Projekt: [seitenwerk-website](https://app.netlify.com/projects/seitenwerk-website/deploys), Domain `seitenwerk.world`.

1. Das aktuelle Exportpaket herunterladen und entpacken.
2. Im bestehenden Projekt den Bereich **Deploys** öffnen.
3. Zum Bereich für manuelle Deploys/Datei-Upload scrollen (je nach Oberfläche „Deploy manually“ oder „Drag and drop“).
4. Den entpackten Website-Ordner hochladen. Direkt in diesem Ordner müssen `index.html`, `_headers`, `robots.txt`, `_next` und die Unterordner wie `impressum` liegen. Nicht den übergeordneten Projektordner oder das vollständige Repository hochladen.
5. Warten, bis der Deploy „Published“/„Ready“ ist, danach `https://seitenwerk.world/impressum` und `/kontakt` prüfen.

Für diesen statischen Upload sind kein VPS, kein Build-Befehl und keine Supabase-Schlüssel in Netlify erforderlich. Kein neues Netlify-Projekt anlegen und keine Domain wechseln. `noindex` im Export bleibt aktiv.

Die verfügbare Netlify-Anbindung in dieser Sitzung kann Projekt-/Deploystatus lesen, bietet aber keinen Datei-Upload oder Deploy-Start. Es ist auch kein CLI-Zugang in der Laufzeit konfiguriert. Deshalb wird die Veröffentlichung nicht als bereits erledigt behauptet.

Der statische Export enthält die beim Erstellen aus Supabase geladenen Angaben. Spätere Änderungen benötigen einen neuen Export und Upload. Admin, Demos, Zahlungen und Worker werden durch dieses Paket nicht auf Netlify bereitgestellt. DRY_RUN bleibt aktiv.
