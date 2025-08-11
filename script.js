
const versandkostenProLand = {
  "Deutschland": 14.90,
  "Österreich": 24.90,
  "Frankreich": 24.90,
  "Niederlande": 19.90,
  "Schweiz": 39.00,
  "Belgien": 19.90
};


// Kunden- und Artikel-Daten
let kunden = [...KundenData]; // Großes K!
let aktuellerKunde = null;
let warenkorb = [];
let bestellungen = JSON.parse(localStorage.getItem('bestellungen') || '[]');
let gespeicherteSichtbar = false;
let bearbeiteBestellungIndex = null;

// DOM-Elemente
const kundeSuche = document.getElementById('kundeSuche');
const suchErgebnisse = document.getElementById('suchErgebnisse');
const aktuellerKundeAnzeige = document.getElementById('aktuellerKunde');
const sperrhinweis = document.getElementById('sperrhinweis');
const ustidFeld = document.getElementById('ustid');
const landDropdown = document.getElementById('land');
const scanInput = document.getElementById('scanInput');
const artikelSuchErgebnisse = document.getElementById('artikelSuchErgebnisse');

// Beim Wechsel des Landes das USt-Id Feld ein-/ausblenden
landDropdown.addEventListener('change', () => {
  ustidFeld.style.display = (landDropdown.value !== "Deutschland") ? "block" : "none";
});

// Kundensuche
kundeSuche.addEventListener('input', () => {
  const query = kundeSuche.value.toLowerCase().trim();
  suchErgebnisse.innerHTML = '';
  if (query.length === 0) return;

  const treffer = kunden.filter(k =>
    (k.name && k.name.toLowerCase().includes(query)) ||
    (k.vorname && k.vorname.toLowerCase().includes(query)) ||
    (k.nachname && k.nachname.toLowerCase().includes(query)) ||
    (k.ort && k.ort.toLowerCase().includes(query))
  );

  if (treffer.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Neukunde erfassen';
    li.style.fontStyle = 'italic';
    li.onclick = () => {
      document.getElementById('neukundeFormular').style.display = 'block';
      suchErgebnisse.innerHTML = '';
    };
    suchErgebnisse.appendChild(li);
    return;
  }

  treffer.slice(0, 10).forEach(k => {
    const li = document.createElement('li');
    li.textContent = `${k.name} (${k.ort})${k.gesperrt ? ' ⚠️' : ''}`;
    li.onclick = () => {
      aktuellerKunde = k;
      aktuellerKundeAnzeige.textContent = `Kunde: ${k.name} (${k.ort})`;
      sperrhinweis.textContent = k.gesperrt ? '⚠️ Achtung: Dieser Kunde ist gesperrt!' : '';
      suchErgebnisse.innerHTML = '';
      kundeSuche.value = '';
      updateWarenkorb();
    };
    suchErgebnisse.appendChild(li);
  });
});

function updateBestellStatistik() {
  const container = document.getElementById('bestellStatistik');
  if (!container) return;

  let anzahl = bestellungen.length;
  let gesamt = 0;

  bestellungen.forEach(b => {
    b.positionen.forEach(p => {
      const menge = Number(p.menge) || 0;
      const preis = Number(p.Preis ?? p.preis) || 0;
      gesamt += menge * preis;
    });
  });

  container.textContent = `Aufträge: ${anzahl} | Umsatz: ${gesamt.toFixed(2)} €`;
}

function neukundeSpeichern() {
  const k = {
    name: document.getElementById('firma').value.trim(),
    vorname: document.getElementById('vorname').value.trim(),
    nachname: document.getElementById('nachname').value.trim(),
    strasse: document.getElementById('strasse').value.trim(),
    plz: document.getElementById('plz').value.trim(),
    ort: document.getElementById('ort').value.trim(),
    land: document.getElementById('land').value.trim(),
    ustid: document.getElementById('ustid').value.trim(),
    telefon: document.getElementById('telefon').value.trim(),
    email: document.getElementById('email').value.trim()
  };
  if (!k.name || !k.vorname || !k.nachname || !k.strasse || !k.plz || !k.ort || !k.telefon || !k.email || (k.land !== "Deutschland" && k.ustid === '')) {
    alert('Bitte alle Pflichtfelder ausfüllen.');
    return;
  }
  kunden.push(k);
  aktuellerKunde = k;
  aktuellerKundeAnzeige.textContent = `Neukunde: ${k.name} (${k.ort})`;
  sperrhinweis.textContent = '';
  document.getElementById('neukundeFormular').style.display = 'none';
}

function bestellungSpeichern() {
  if (!aktuellerKunde) { alert('Bitte zuerst einen Kunden auswählen.'); return; }
  if (warenkorb.length === 0) { alert('Bitte mindestens ein Produkt in den Warenkorb legen.'); return; }

  // 1) Falls doch Versand im Warenkorb wäre: rausfiltern
  const positionenOhneVersand = warenkorb
    .filter(p => !istVersandPosition(p))
    .map(p => ({ ...p }));

  // 2) Versand passend zum Land als letzte Position ergänzen
  const vk = Number(versandkostenProLand?.[aktuellerKunde.land]) || 0;
  if (vk > 0) {
    positionenOhneVersand.push({
      Name: 'Versand',
      Preis: vk,
      menge: 1,
      Artikelnummer: 'VERSAND-' + aktuellerKunde.land
    });
  }

  const bestellung = {
    kunde: aktuellerKunde,
    positionen: positionenOhneVersand,
    lieferdatum: document.getElementById('lieferdatum').value,
    kommentar: document.getElementById('kommentar').value,
    timestamp: Date.now()
  };

  if (bearbeiteBestellungIndex !== null) {
    bestellungen[bearbeiteBestellungIndex] = bestellung;
    bearbeiteBestellungIndex = null;
  } else {
    bestellungen.push(bestellung);
  }

  localStorage.setItem('bestellungen', JSON.stringify(bestellungen));
  warenkorb = [];
updateWarenkorb();               // jetzt wird keine Versandzeile mehr angezeigt
document.getElementById('gespeicherteListe').style.display = 'none';
updateBestellStatistik();
  // Formular zurücksetzen …
  ['lieferdatum','kommentar','kundeSuche','firma','vorname','nachname','strasse','plz','ort','ustid','telefon','email'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  aktuellerKunde = null;
  aktuellerKundeAnzeige.textContent = '';
  sperrhinweis.textContent = '';
  document.getElementById('land').value = 'Deutschland';
  document.getElementById('neukundeFormular').style.display = 'none';
  document.getElementById('ustid').style.display = 'none';

  alert('Bestellung gespeichert!');
}

function istVersandPosition(p){
  const name = (p?.Name || p?.name || '').trim().toLowerCase();
  const nr   = String(p?.Artikelnummer || p?.artikelnummer || '');
  return name === 'versand' || nr.startsWith('VERSAND-');
}
function manuellenArtikelHinzufuegen() {
  const name = document.getElementById('manuellerArtikelName').value.trim();
  const preis = parseFloat(document.getElementById('manuellerArtikelPreis').value.replace(',', '.'));
  if (!name || isNaN(preis) || preis <= 0) {
    alert('Bitte gib einen Artikelnamen und einen gültigen Preis an!');
    return;
  }
  warenkorb.push({
    Name: name,
    Preis: preis,
    menge: 1,
    // KEINE Artikelnummer vergeben!
  });
  document.getElementById('manuellerArtikelName').value = '';
  document.getElementById('manuellerArtikelPreis').value = '';
  updateWarenkorb();
}
function getVersandFuerAktuellenKunden(){
  if (!aktuellerKunde) return 0;
  const vk = versandkostenProLand[aktuellerKunde.land];
  return Number(vk) || 0;
}
function updateWarenkorb() {
  const liste = document.getElementById('warenkorbListe');
  const preis = document.getElementById('gesamtpreis');
  liste.innerHTML = '';
  let summe = 0;

  const toNum = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Produkte rendern
  warenkorb.forEach((item, index) => {
    const name    = item.Name ?? item.name ?? '';
    const einheit = item.Einheit ?? item.einheit ?? 'Stk';
    const stPreis = toNum(item.Preis ?? item.preis);
    const menge   = toNum(item.menge);

    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${name}</strong> (${einheit})<br>
      <button class="red" onclick="mengeAnpassen(${index}, -1)">-</button>
      ${menge} × ${stPreis.toFixed(2)} € = ${(menge * stPreis).toFixed(2)} €
      <button class="green" onclick="mengeAnpassen(${index}, 1)">+</button>
    `;
    liste.appendChild(li);

    summe += menge * stPreis;
  });

  // Versand nur anzeigen, wenn Kunde existiert UND Warenkorb nicht leer ist
  const vk = (aktuellerKunde && warenkorb.length > 0) ? getVersandFuerAktuellenKunden() : 0;
  if (vk > 0) {
    const liV = document.createElement('li');
    liV.style.marginTop = '6px';
    liV.style.paddingTop = '6px';
    liV.style.borderTop = '1px dashed #ccc';
    liV.innerHTML = `
      <strong>Versand (${aktuellerKunde?.land || '-'})</strong><br>
      1 × ${vk.toFixed(2)} € = ${vk.toFixed(2)} €
    `;
    liste.appendChild(liV);
    summe += vk;
  }

  preis.textContent = 'Gesamt: ' + summe.toFixed(2) + ' €';
}
function mengeAnpassen(index, richtung) {
  const artikel = warenkorb[index];
  const einheitMenge = artikel.Einheit || artikel.einheit || 1;
  artikel.menge += richtung * einheitMenge;
  if (artikel.menge < einheitMenge) {
    warenkorb.splice(index, 1);
  }
  updateWarenkorb();
}

// Artikelsuche (Scan/Tippen)
scanInput.addEventListener('input', () => {
  const query = scanInput.value.trim();
  artikelSuchErgebnisse.innerHTML = '';
  if (!query) return;

  const treffer = ArtikelData.filter(a =>
    String(a.Artikelnummer || '').toLowerCase() === query.toLowerCase()
  );

  if (query.length === 4 && treffer.length === 1) {
    const artikel = treffer[0];
    const vielfaches = artikel.Einheit || artikel.einheit || 1;
    const vorhanden = warenkorb.find(w =>
      String(w.Artikelnummer || w.artikelnummer) === String(artikel.Artikelnummer)
    );
    if (vorhanden) {
      vorhanden.menge += vielfaches;
    } else {
      warenkorb.push({ ...artikel, menge: vielfaches });
    }
    updateWarenkorb();
    scanInput.value = '';
    scanInput.focus();
    return;
  }

  const unscharfeTreffer = ArtikelData.filter(a =>
    (a.Name && a.Name.toLowerCase().includes(query.toLowerCase())) ||
    (a.Artikelnummer && String(a.Artikelnummer).toLowerCase().includes(query.toLowerCase()))
  );

  unscharfeTreffer.slice(0, 30).forEach(artikel => {
    const li = document.createElement('li');
    li.textContent = `${artikel.Artikelnummer}, ${artikel.Name}, € ${artikel.Preis}`;
    li.onclick = () => {
      const vielfaches = artikel.Einheit || artikel.einheit || 1;
      const vorhanden = warenkorb.find(w =>
        String(w.Artikelnummer || w.artikelnummer) === String(artikel.Artikelnummer)
      );
      if (vorhanden) {
        vorhanden.menge += vielfaches;
      } else {
        warenkorb.push({ ...artikel, menge: vielfaches });
      }
      updateWarenkorb();
      artikelSuchErgebnisse.innerHTML = '';
      scanInput.value = '';
      scanInput.focus();
    };
    artikelSuchErgebnisse.appendChild(li);
  });
});

scanInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const eingabe = scanInput.value.trim();
    const artikel = ArtikelData.find(a => String(a.Artikelnummer) === eingabe);
    if (artikel) {
      const vielfaches = artikel.Einheit || artikel.einheit || 1;
      const vorhanden = warenkorb.find(w => String(w.Artikelnummer || w.artikelnummer) === String(artikel.Artikelnummer));
      if (vorhanden) {
        vorhanden.menge += vielfaches;
      } else {
        warenkorb.push({ ...artikel, menge: vielfaches });
      }
      updateWarenkorb();
      scanInput.value = '';
      artikelSuchErgebnisse.innerHTML = '';
    }
  }
});
function toggleGespeicherteBestellungen() {
  const container = document.getElementById('gespeicherteListe');
  const willShow = container.style.display !== 'block';
  container.style.display = willShow ? 'block' : 'none';
  if (willShow) zeigeGespeicherteBestellungen();
}
function berechneBestellSummen() {
  let anzahl = bestellungen.length, gesamt = 0;
  bestellungen.forEach(b => b.positionen.forEach(p => {
    const menge = Number(p.menge)||0, preis = Number(p.Preis ?? p.preis)||0;
    gesamt += menge * preis;
  }));
  return { anzahl, gesamt };
}
function zeigeGespeicherteBestellungen() {
  const container = document.getElementById('gespeicherteListe');
  container.innerHTML = '';

  // 📊 Summenzeile
  const { anzahl, gesamt } = berechneBestellSummen();
  const summary = document.createElement('div');
  summary.style.cssText = "display:flex;justify-content:space-between;align-items:center;background:#f1f3f5;border:1px solid #dee2e6;border-radius:6px;padding:8px 12px;margin-bottom:8px;font-weight:600;";
  summary.innerHTML = `<span>📊 Aufträge gesamt: ${anzahl}</span><span>Umsatz: ${gesamt.toFixed(2)} €</span>`;
  container.appendChild(summary);

  if (bestellungen.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = 'Keine gespeicherten Bestellungen gefunden.';
    container.appendChild(empty);   // Summary bleibt stehen
    return;
  }

    bestellungen.forEach((b, index) => {
    let gesamtwert = 0;
    b.positionen.forEach(p => {
      const menge = Number(p.menge)||0, preis = Number(p.Preis ?? p.preis)||0;
      gesamtwert += menge * preis;
    });
    const div = document.createElement('div');
    div.className = 'bestellung';
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span><strong>${b.kunde.name} (${b.kunde.ort})</strong></span>
        <span><strong>${gesamtwert.toFixed(2)} €</strong></span>
        <button onclick="bearbeiteBestellung(${index})" style="margin-left:10px;">✏️ Bearbeiten</button>
      </div>
      <hr>
    `;
    container.appendChild(div);
  }); // <-- schließt den forEach
}      // <-- schließt die Funktion

function bearbeiteBestellung(index) {
  const bestellung = bestellungen[index];
  aktuellerKunde = bestellung.kunde;

  // Nur Produktpositionen übernehmen (kein Versand zurück in den Warenkorb)
  warenkorb = bestellung.positionen
    .filter(p => !istVersandPosition(p))
    .map(p => ({ ...p }));

  document.getElementById('lieferdatum').value = bestellung.lieferdatum || '';
  document.getElementById('kommentar').value = bestellung.kommentar || '';
  bearbeiteBestellungIndex = index;
  updateWarenkorb();
  aktuellerKundeAnzeige.textContent = `Kunde: ${aktuellerKunde.name} (${aktuellerKunde.ort})`;
}

function loescheAlleBestellungen() {
  if (confirm("Willst du wirklich alle Bestellungen unwiderruflich löschen?")) {
    localStorage.removeItem('bestellungen');
    bestellungen = [];
    zeigeGespeicherteBestellungen();
    updateWarenkorb();
    alert("Alle Bestellungen wurden gelöscht!");
    updateBestellStatistik();
  }
}

// ========== WECLAPP CSV EXPORT ==========
function exportiereWeclappCSV() {
  if (bestellungen.length === 0) {
    alert("Keine Bestellungen vorhanden!");
    return;
  }

  // Die Spaltennamen exakt wie in deinem Import-Template (Tab als Trennzeichen)
  const header = [
    "AUFTRAGSNUMMER", "Auftragsdatum", "Geplantes Lieferdatum", "Währung", "Auftragsart",
    "Zahlungsbedingungen", "Versandart", "Lieferbedingungen", "Zahlungsart", "Handelssprache",
    "Artikelnummer oder EAN", "Artikelbeschreibung", "MENGE", "PREIS", "Steuersatz",
    "Rabatt (%)", "Notiz", "KUNDENNUMMER", "Kunden Bestellnummer", "Vertriebsweg", "Kommission",
    "Firma", "Firmenzusatz", "Anrede", "Vorname", "Nachname", "E-Mail", "Telefonnummer",
    "Straße", "Stadt", "Postleitzahl", "LAND",
    "Abweichende Lieferadresse Firma", "Abweichende Lieferadresse Firma-Zusatz",
    "Abweichende Lieferadresse Vorname", "Abweichende Lieferadresse Nachname",
    "Abweichende Lieferadresse Straße", "Abweichende Lieferadresse Postleitzahl",
    "Abweichende Lieferadresse Stadt", "Abweichende Lieferadresse Land",
    "Versandkostenartikel", "Positionstyp", "Geplante Arbeitszeit pro Einheit",
    "Manuelle Arbeitszeit pro Einheit", "Abrechnungsart"
  ];

  let csvRows = [];
  csvRows.push(header.join('\t')); // Tab als Trennzeichen

  bestellungen.forEach((b) => {
    const auftragsnummer = b.timestamp || Date.now(); // Zeitstempel pro Bestellung
    const kunde = b.kunde || {};
    const auftragsdatum = ""; // optional, sonst neues Date-Format
    b.positionen.forEach(p => {
      const row = [];
      row[0]  = auftragsnummer;                // AUFTRAGSNUMMER (Zeitstempel)
      row[1]  = auftragsdatum;                 // Auftragsdatum (leer)
      row[2]  = b.lieferdatum || "";           // Geplantes Lieferdatum
      row[3]  = "EUR";                         // Währung
      row[4]  = "";                            // Auftragsart
      row[5]  = "";                            // Zahlungsbedingungen
      row[6]  = "";                            // Versandart
      row[7]  = "";                            // Lieferbedingungen
      row[8]  = "";                            // Zahlungsart
      row[9]  = "de";                          // Handelssprache
      row[10] = p.Artikelnummer || p.artikelnummer || ""; // Artikelnummer/EAN (Pflicht!)
      row[11] = p.Name || p.name || "";        // Artikelbeschreibung
      row[12] = p.menge || 1;                  // MENGE
      row[13] = p.Preis ?? p.preis ?? "";      // PREIS (Pflicht!)
      row[14] = "";                            // Steuersatz
      row[15] = "";                            // Rabatt (%)
      row[16] = b.kommentar || "";             // Notiz
      row[17] = b.kunde.kundennummer || "";    // R: KUNDENNUMMER (wird aus KundenData übernommen, bei Neukunde leer)
      row[18] = "";                            // Kunden Bestellnummer
      row[19] = "";                            // Vertriebsweg
      row[20] = "";                            // Kommission
      row[21] = kunde.name || "";              // Firma
      row[22] = "";                            // Firmenzusatz
      row[23] = "";                            // Anrede
      row[24] = kunde.vorname || "";           // Vorname
      row[25] = kunde.nachname || "";          // Nachname
      row[26] = kunde.email || "";             // E-Mail
      row[27] = kunde.telefon || "";           // Telefonnummer
      row[28] = kunde.strasse || "";           // Straße
      row[29] = kunde.ort || "";               // Stadt
      row[30] = kunde.plz || "";               // Postleitzahl
      row[31] = kunde.land || "";              // LAND (Pflicht!)
      row[32] = ""; // Abweichende Lieferadresse Firma
      row[33] = ""; // Abweichende Lieferadresse Firma-Zusatz
      row[34] = ""; // Abweichende Lieferadresse Vorname
      row[35] = ""; // Abweichende Lieferadresse Nachname
      row[36] = ""; // Abweichende Lieferadresse Straße
      row[37] = ""; // Abweichende Lieferadresse Postleitzahl
      row[38] = ""; // Abweichende Lieferadresse Stadt
      row[39] = ""; // Abweichende Lieferadresse Land
      row[40] = ""; // Versandkostenartikel
      row[41] = ""; // Positionstyp
      row[42] = ""; // Geplante Arbeitszeit pro Einheit
      row[43] = ""; // Manuelle Arbeitszeit pro Einheit
      row[44] = ""; // Abrechnungsart

      csvRows.push(row.map(x => typeof x === "string" && x.includes('\t') ? `"${x}"` : x).join('\t'));
    });
  });

  // Export als Datei
  const blob = new Blob([csvRows.join('\n')], { type: "text/csv" });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "Bestellungen-Weclapp-Import.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 100);
}

// ========== /WECLAPP EXPORT ==========

// Statistik beim Laden der Seite direkt anzeigen
window.addEventListener('DOMContentLoaded', () => {
  updateBestellStatistik();
  zeigeGespeicherteBestellungen();
});
// ===== Visitenkarte: OCR + Auto-Fill =====
(function initCardScan(){
  const btn = document.getElementById('scanCardBtn');
  const fileInput = document.getElementById('cardImage');
  const statusEl = document.getElementById('ocrStatus');
  const prevWrap = document.getElementById('ocrPreview');
  const prevText = document.getElementById('ocrText');

  if(!btn || !fileInput) return;

  btn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    let file = e.target.files?.[0];         // <-- let, nicht const
    if (!file) return;

    statusEl.textContent = 'Bild wird gelesen… (kann je nach Gerät 5–20 s dauern)';
    prevWrap.style.display = 'none';
    prevText.textContent = '';

    try {
      // HEIC vom iPad → JPEG
      file = await ensureJpeg(file);

      const text = await ocrImage(file, s => statusEl.textContent = s);
      prevText.textContent = text;
      prevWrap.style.display = 'block';

      const data = parseBusinessCardText(text);
      fillCustomerForm(data);
      statusEl.textContent = 'Felder aus Visitenkarte befüllt – bitte prüfen.';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Fehler beim Lesen der Visitenkarte.';
      alert('Konnte die Visitenkarte nicht lesen. Bitte versuche ein schärferes Foto mit guter Beleuchtung.');
    } finally {
      fileInput.value = '';
    }
  });
})(); // <-- IIFE sauber schließen


// OCR: liest Bild mit Tesseract.js (offline im Browser)
async function ensureJpeg(file) {
  const type = (file.type || '').toLowerCase();
  if (type.includes('heic') || type.includes('heif')) {
    const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    return new File([blob], (file.name || 'photo') + '.jpg', { type: 'image/jpeg' });
  }
  return file;
}

async function toCanvasSafe(file, maxSide=2000) {
  // versuche createImageBitmap, fallback auf <img>
  const draw = (img) => {
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const cw = Math.max(1, Math.round(img.width * scale));
    const ch = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    ctx.filter = 'contrast(120%) brightness(105%)';
    ctx.drawImage(img, 0, 0, cw, ch);
    return c;
  };

  // Safari-weg: DataURL + <img>
  const asImageElem = async (blob) => {
    const dataURL = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    return await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = dataURL;
    });
  };

  try {
    const bmp = await createImageBitmap(file);
    // aus ImageBitmap ein HTMLImageElement machen:
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    c.getContext('2d').drawImage(bmp, 0, 0);
    const img = await new Promise((res) => {
      const el = new Image();
      el.onload = () => res(el);
      el.src = c.toDataURL('image/jpeg', 0.92);
    });
    return draw(img);
  } catch {
    const img = await asImageElem(file);
    return draw(img);
  }
}

// Safari-sicheres OCR: keine File/ImageBitmap-Übergabe an den Worker
async function ocrImage(file, onStatus) {
  const update = (msg) => { if (onStatus) onStatus(msg); };

  // --- Hilfen ---
  const runWithTimeout = (p, ms, label='Vorgang') =>
    Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} Timeout nach ${ms/1000}s`)), ms))
    ]);

  // File -> Canvas (DataURL-Weg, läuft auf iOS/Safari stabil)
  const fileToCanvas = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Konnte Bild nicht lesen.'));
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 2000;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.filter = 'contrast(120%) brightness(105%)';
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c);
      };
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
      img.src = fr.result; // Data-URL
    };
    fr.readAsDataURL(file);
  });

  // --- Tesseract Worker ---
  const worker = await Tesseract.createWorker({
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
    langPath:   'https://tessdata.projectnaptha.com/4.0.0_best',
    logger: m => {
      if (m?.status) {
        if (m.status === 'recognizing text') update(`Erkenne Text… ${Math.round((m.progress||0)*100)}%`);
        else update(m.status);
      }
    }
  });

  let terminated = false;
  const safeTerminate = async () => { if (!terminated) { terminated = true; try { await worker.terminate(); } catch {} } };

  try {
    update('Lade OCR…');
    await runWithTimeout(worker.load(), 15000, 'Worker laden');

    // Sprachen laden/initialisieren (mit Mirror-Fallback)
    try {
      update('Sprachdaten laden…');
      await runWithTimeout(worker.loadLanguage('eng'), 20000, 'ENG laden');
      await runWithTimeout(worker.loadLanguage('deu'), 20000, 'DEU laden');
      await runWithTimeout(worker.initialize('eng+deu'), 15000, 'Initialisieren');
    } catch (e) {
      console.warn('DEU nicht verfügbar, versuche Mirror…', e);
      await worker.setParameters({ langPath: 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0_best' });
      try {
        await runWithTimeout(worker.loadLanguage('deu'), 20000, 'DEU (Mirror) laden');
        await runWithTimeout(worker.initialize('eng+deu'), 15000, 'Initialisieren (Mirror)');
      } catch {
        console.warn('Falle auf ENG zurück.');
        await runWithTimeout(worker.initialize('eng'), 15000, 'Initialisieren ENG');
      }
    }

    update('Bereite Bild vor…');
    const canvas = await runWithTimeout(fileToCanvas(file), 12000, 'Bild vorbereiten');

    // -> ImageData statt Blob/ImageBitmap an den Worker (fix für Safari DataCloneError)
    // -> DataURL (JPEG) an den Worker schicken – Safari-sicher
const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

update('Erkenne Text…');
const { data: { text } } = await runWithTimeout(
  worker.recognize(dataUrl),
  60000,
  'Texterkennung'
);

    return text;
  } finally {
    await safeTerminate();
  }
}
// Heuristiken zum Parsen der typischen Felder
function parseBusinessCardText(rawText){
  const text = rawText
    .replace(/\u00AD/g, '') // Soft hyphen
    .replace(/[^\S\r\n]+/g, ' ')
    .trim();

  // Zeilenweise arbeiten
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const out = {
    firma: '',
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    ort: '',
    land: '',
    ustid: '',
    telefon: '',
    email: ''
  };

  // E-Mail
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) out.email = emailMatch[0];

  // Telefon (nimmt erste plausible Nummer, mit Ländervorwahl etc.)
  const telMatch = text.match(/(?:Tel\.?|Phone|Telefon|Mob\.?|Mobile|Handy)?[:\s]*([+()\s/.-]*\d[\d\s/().-]{5,})/i);
  if (telMatch) out.telefon = telMatch[1].replace(/\s{2,}/g,' ').trim();

  // USt-Id (mehrere Länderformate grob)
  const vatMatch = text.match(/\b(?:DE|ATU|FR|NL|BE|LU|IT|ES|PT|IE|GB|CH)\s?[A-Z0-9]{6,}\b/i);
  if (vatMatch) out.ustid = vatMatch[0].replace(/\s+/g,'');

  // Land (Liste der UI-Länder)
  const countries = ['Deutschland','Österreich','Frankreich','Italien','Niederlande','Schweiz','Belgien'];
  const landLine = lines.find(l => countries.some(c => new RegExp(c,'i').test(l)));
  if (landLine) {
    out.land = countries.find(c => new RegExp(c,'i').test(landLine)) || '';
  } else {
    // aus PLZ-Format grob schätzen
    if (/\b\d{5}\b/.test(text)) out.land = 'Deutschland';
    else if (/\b[A]\d{3,4}\b/.test(text)) out.land = 'Österreich';
    else if (/\b\d{4}\b/.test(text) && /CH|Schweiz/i.test(text)) out.land = 'Schweiz';
    else if (/\b\d{5}\b/.test(text) && /FR|France|Frankreich/i.test(text)) out.land = 'Frankreich';
    else if (/\b\d{4}\b/.test(text) && /BE|Belgium|Belgien/i.test(text)) out.land = 'Belgien';
    else if (/\b\d{4}\s?[A-Z]{2}\b/.test(text) || /NL|Netherlands|Niederlande/i.test(text)) out.land = 'Niederlande';
  }

  // Adresse (Straße + PLZ + Ort)
  // Straße: etwas mit „str.“/„straße“ oder Nummer am Ende
  const streetIdx = lines.findIndex(l => /\b(str\.?|straße|strasse)\b/i.test(l) || /\d+[a-zA-Z]?$/.test(l));
  if (streetIdx >= 0) {
    out.strasse = lines[streetIdx];
    // Nächste Zeile könnte PLZ/Ort sein
    const next = lines[streetIdx+1] || '';
    // DE/AT: 5-stellig / 4-stellig; FR/NL/BE variieren – ein paar häufige Muster:
    let m = next.match(/\b(\d{4,5})\s+([A-Za-zÀ-ÿ.\-'\s]+)\b/);
    if (!m) m = lines[streetIdx].match(/\b(\d{4,5})\s+([A-Za-zÀ-ÿ.\-'\s]+)\b/); // manchmal in einer Zeile
    if (!m) {
      // NL: 1234 AB Stadt
      m = next.match(/\b(\d{4})\s*([A-Z]{2})\s+([A-Za-zÀ-ÿ.\-'\s]+)\b/);
      if (m) { out.plz = `${m[1]} ${m[2]}`; out.ort = m[3].trim(); }
    } else {
      out.plz = m[1];
      out.ort = (m[2] || '').trim();
    }
  }

  // Firma + Name (heuristisch aus den obersten Zeilen ohne E-Mail/Telefon/Adresse)
  const ignorePatterns = [
    /@/, /Tel|Phone|Mobil|Mobile|Handy/i, /\b(?:DE|ATU|FR|NL|BE|LU|IT|ES|PT|IE|GB|CH)\s?[A-Z0-9]{6,}\b/i,
    /\b(\d{4,5})\b/, /\d{4}\s?[A-Z]{2}/
  ];
  const headerLines = lines.filter(l => !ignorePatterns.some(rx => rx.test(l)));

  if (headerLines.length) {
    // Erste geeignete Zeile als Firma (wenn groß geschrieben oder GmbH/AG/SARL/etc.)
    const firmIdx = headerLines.findIndex(l => /\b(GmbH|AG|UG|SARL|S\.?A\.?|BV|NV|SRL|LLC|Inc\.?)\b/i.test(l));
    const firmLine = firmIdx >= 0 ? headerLines[firmIdx] : headerLines[0];
    out.firma = firmLine;

    // Name: suche eine Zeile mit 2 Wörtern (Initialen groß)
    const nameLine = headerLines.find(l => /\b[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß'-]+\b/.test(l));
    if (nameLine) {
      const [vn, ...rest] = nameLine.split(/\s+/);
      out.vorname = vn;
      out.nachname = rest.join(' ');
      // Falls die „Firma“ irrtümlich der Name war, und eine zweite Zeile existiert, rotiere
      if (out.firma === nameLine && headerLines[1]) out.firma = headerLines[1];
    }
  }

  // Aufräumen: häufige Artefakte
  out.strasse = out.strasse.replace(/\s{2,}/g,' ').trim();
  out.ort = out.ort.replace(/\s{2,}/g,' ').trim();
  out.firma = out.firma.replace(/\s{2,}/g,' ').trim();
  out.vorname = out.vorname.trim();
  out.nachname = out.nachname.trim();

  return out;
}

// Überträgt geparste Daten in deine Formularfelder
function fillCustomerForm(d){
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };

  set('firma', d.firma);
  set('vorname', d.vorname);
  set('nachname', d.nachname);
  set('strasse', d.strasse);
  set('plz', d.plz);
  set('ort', d.ort);
  set('telefon', d.telefon);
  set('email', d.email);
  set('ustid', d.ustid);

  const landSel = document.getElementById('land');
  if (landSel && d.land) {
    // Auf einen deiner Select-Werte mappen, falls Text minimal abweicht
    const options = Array.from(landSel.options).map(o => o.value);
    const match = options.find(o => new RegExp('^' + o + '$','i').test(d.land)) || '';
    if (match) landSel.value = match;

    // USt-ID Feld anzeigen, falls EU-Ausland
    ustidFeld.style.display = (landSel.value !== 'Deutschland') ? 'block' : 'none';
  }
}
