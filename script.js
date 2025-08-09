
// =========================
// Messe-Bestelltool – script.js (bereinigt & komplett)
// =========================

// --- Datenquellen ---
// Erwartet werden globale Variablen aus separaten Dateien:
//   - window.kundenData  (optional; sonst Start leer)
//   - window.artikelData (erforderlich; Liste der Artikel mit Feldern:
//       artikelnummer, name, einheit, preis, vielfaches )
// Wenn du alles in einer index.html hast, stelle sicher, dass die <script>-Tags
// für Kunden/Artikel VOR dieser Datei eingebunden werden.

let kunden = Array.isArray(window.kundenData) ? [...window.kundenData] : [];
let aktuellerKunde = null;
let warenkorb = [];
let bestellungen = []; // Sammel-Array aller gespeicherten Bestellungen (für Export)

// --- DOM-Caching ---
const el = (id) => document.getElementById(id);
const kundeSuche = el('kundeSuche');
const suchErgebnisse = el('suchErgebnisse');
const aktuellerKundeAnzeige = el('aktuellerKunde');
const sperrhinweis = el('sperrhinweis');
const ustidFeld = el('ustid');
const landDropdown = el('land');
const warenkorbListe = el('warenkorbListe');
const gesamtpreis = el('gesamtpreis');
const scanInput = el('scanInput');

// --- Hilfen ---
function formatEuro(n) {
  const num = Number(n || 0);
  return num.toFixed(2).replace('.', ',') + ' €';
}

// ---------- Land / USt-ID-Steuerung ----------
if (landDropdown) {
  landDropdown.addEventListener('change', () => {
    const land = landDropdown.value;
    const euLaender = ["Österreich", "Frankreich", "Italien", "Niederlande"];
    ustidFeld.style.display = (land !== "Deutschland" && euLaender.includes(land)) ? "block" : "none";
  });
}

// ---------- Kunden-Suche ----------
if (kundeSuche && suchErgebnisse) {
  kundeSuche.addEventListener('input', () => {
    const query = (kundeSuche.value || "").toLowerCase().trim();
    suchErgebnisse.innerHTML = '';
    if (query.length === 0) return;

    const treffer = kunden.filter(k =>
      (k.name || '').toLowerCase().includes(query) ||
      (k.ort  || '').toLowerCase().includes(query)
    );

    if (treffer.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Neukunde erfassen';
      li.style.fontStyle = 'italic';
      li.onclick = () => {
        zeigeNeukundeFormular();
        suchErgebnisse.innerHTML = '';
      };
      suchErgebnisse.appendChild(li);
      return;
    }

    treffer.slice(0, 10).forEach(k => {
      const li = document.createElement('li');
      li.textContent = `${k.name} (${k.ort || '—'})`;
      li.style.cursor = 'pointer';
      li.onclick = () => {
        aktuellerKunde = k;
        if (aktuellerKundeAnzeige) {
          aktuellerKundeAnzeige.textContent = `Kunde: ${k.name} (${k.ort || '—'})`;
        }
        if (sperrhinweis) {
          sperrhinweis.textContent = k.gesperrt ? '⚠️ Achtung: Dieser Kunde ist gesperrt!' : '';
        }
        suchErgebnisse.innerHTML = '';
        kundeSuche.value = '';
      };
      suchErgebnisse.appendChild(li);
    });
  });
}

// ---------- Neukunde ----------
function zeigeNeukundeFormular() {
  const form = el('neukundeFormular');
  if (form) form.style.display = 'block';
}

function neukundeSpeichern() {
  const firma    = (el('firma')?.value || '').trim();
  const vorname  = (el('vorname')?.value || '').trim();
  const nachname = (el('nachname')?.value || '').trim();
  const strasse  = (el('strasse')?.value || '').trim();
  const plz      = (el('plz')?.value || '').trim();
  const ort      = (el('ort')?.value || '').trim();
  const land     = (el('land')?.value || '').trim();
  const ustid    = (el('ustid')?.value || '').trim();
  const telefon  = (el('telefon')?.value || '').trim();
  const email    = (el('email')?.value || '').trim();

  if (!firma || !vorname || !nachname || !strasse || !plz || !ort || !telefon || !email) {
    alert('Bitte alle Pflichtfelder ausfüllen.');
    return;
  }
  if (land !== "Deutschland" && ustidFeld && ustidFeld.style.display === "block" && ustid === "") {
    alert('Bitte USt-IdNr. eingeben.');
    return;
  }

  const k = {
    name: firma,
    ort,
    gesperrt: false,
    vorname, nachname, strasse, plz, land, ustid, telefon, email
  };
  kunden.push(k);
  aktuellerKunde = k;
  if (aktuellerKundeAnzeige) aktuellerKundeAnzeige.textContent = `Neukunde: ${firma} (${ort})`;
  if (sperrhinweis) sperrhinweis.textContent = '';
  const form = el('neukundeFormular');
  if (form) form.style.display = 'none';
}

// ---------- Warenkorb ----------
function updateWarenkorb() {
  if (!warenkorbListe || !gesamtpreis) return;
  warenkorbListe.innerHTML = '';
  let summe = 0;

  warenkorb.forEach((item, index) => {
    const einheit = item.einheit || 'Stk';
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
        <div style="flex:1 1 auto; min-width:240px;">
          <strong>${item.name}</strong><br>
          <small>${item.artikelnummer} • ${einheit} • ${Number(item.preis).toFixed(2)} €</small>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <button class="red" onclick="mengeAnpassen(${index}, -1)">-</button>
          <span>${item.menge}</span>
          <button class="green" onclick="mengeAnpassen(${index}, 1)">+</button>
        </div>
        <div style="min-width:120px; text-align:right;">
          <strong>${formatEuro(item.menge * item.preis)}</strong>
        </div>
      </div>
    `;
    warenkorbListe.appendChild(li);
    summe += item.menge * item.preis;
  });

  gesamtpreis.textContent = 'Gesamt: ' + formatEuro(summe).replace(' €',' €');
}

function mengeAnpassen(index, richtung) {
  const artikel = warenkorb[index];
  if (!artikel) return;
  const einheitMenge = artikel.vielfaches || 1;
  artikel.menge += richtung * einheitMenge;
  if (artikel.menge < einheitMenge) {
    warenkorb.splice(index, 1);
  }
  updateWarenkorb();
}

// Scan/Eingabe Feld
if (scanInput) {
  scanInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const nummer = (e.target.value || '').trim();
      if (!Array.isArray(window.artikelData) || window.artikelData.length === 0) {
        alert('Artikelliste nicht geladen. Bitte stelle sicher, dass artikelData vorhanden ist.');
        return;
      }
      const artikel = window.artikelData.find(a => String(a.artikelnummer) === nummer);
      if (!artikel) {
        alert('Artikel nicht gefunden.');
        return;
      }
      const vorhandener = warenkorb.find(w => String(w.artikelnummer) === nummer);
      const vielfaches = artikel.vielfaches || 1;
      if (vorhandener) {
        vorhandener.menge += vielfaches;
      } else {
        warenkorb.push({ ...artikel, menge: vielfaches });
      }
      updateWarenkorb();
      e.target.value = '';
    }
  });
}

// ---------- Bestellung speichern ----------
function speichereBestellung() {
  if (!aktuellerKunde) {
    alert('Bitte zuerst einen Kunden auswählen oder erfassen!');
    return;
  }
  if (warenkorb.length === 0) {
    alert('Warenkorb ist leer.');
    return;
  }

  const lieferdatum = el('lieferdatum')?.value || '';
  const kommentar = el('kommentar')?.value || '';

  const daten = warenkorb.map(item => ({
    kundenname: aktuellerKunde.name,
    ort: aktuellerKunde.ort,
    artikelnummer: item.artikelnummer,
    artikelname: item.name,
    menge: item.menge,
    preis: Number(item.preis).toFixed(2),
    gesamtpreis: (item.menge * item.preis).toFixed(2),
    lieferdatum,
    kommentar,
    zeitstempel: new Date().toISOString()
  }));

  // in Sammelliste und in localStorage persistieren
  bestellungen.push(...daten);
  persistiereBestellungen();

  alert('Bestellung gespeichert!');
  warenkorb = [];
  updateWarenkorb();
}

function persistiereBestellungen() {
  try {
    const vorhandene = JSON.parse(localStorage.getItem('weclapp_bestellungen') || '[]');
    const neu = [...vorhandene, ...bestellungen];
    localStorage.setItem('weclapp_bestellungen', JSON.stringify(neu));
  } catch (e) {
    console.warn('Konnte nicht in localStorage speichern:', e);
  }
}

// Optional: gespeicherte anzeigen
function zeigeGespeicherteBestellungen() {
  try {
    const vorhandene = JSON.parse(localStorage.getItem('weclapp_bestellungen') || '[]');
    alert(`Es sind ${vorhandene.length} Zeilen lokal gespeichert.`);
  } catch {
    alert('Keine gespeicherten Bestellungen gefunden.');
  }
}

// ---------- CSV-Export (bereinigt) ----------
function exportiereBestellungen() {
  // Bevorzugt: alles aus localStorage exportieren (damit auch ältere Sitzungen drin sind)
  let rowsQuelle = [];
  try {
    rowsQuelle = JSON.parse(localStorage.getItem('weclapp_bestellungen') || '[]');
  } catch {
    rowsQuelle = [];
  }
  // Fallback: falls leer, nimm den aktuellen Arbeitsspeicher
  if (!rowsQuelle.length && bestellungen.length) {
    rowsQuelle = [...bestellungen];
  }

  if (!rowsQuelle.length) {
    alert('Keine gespeicherten Bestellungen zum Exportieren.');
    return;
  }

  const header = [
    "Kunde","Ort","Artikelnummer","Artikelbezeichnung","Menge",
    "Einzelpreis netto","Gesamtpreis netto","Lieferdatum","Kommentar"
  ];

  const rows = rowsQuelle.map(obj => [
    obj.kundenname ?? "",
    obj.ort ?? "",
    obj.artikelnummer ?? "",
    obj.artikelname ?? "",
    obj.menge ?? 0,
    obj.preis ?? "",
    obj.gesamtpreis ?? "",
    obj.lieferdatum ?? "",
    obj.kommentar ?? ""
  ]);

  const csv = [header, ...rows]
    .map(row => row
      .map(field => `"${String(field ?? "").replace(/"/g, '""')}"`)
      .join(";")
    )
    .join("\n");

  // BOM für Excel hinzufügen
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'weclapp_bestellungen.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Für globale Buttons verfügbar machen
window.zeigeNeukundeFormular = zeigeNeukundeFormular;
window.neukundeSpeichern = neukundeSpeichern;
window.mengeAnpassen = mengeAnpassen;
window.speichereBestellung = speichereBestellung;
window.zeigeGespeicherteBestellungen = zeigeGespeicherteBestellungen;
window.exportiereBestellungen = exportiereBestellungen;
