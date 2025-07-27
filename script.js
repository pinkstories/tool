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
  if (!aktuellerKunde) {
    alert('Bitte zuerst einen Kunden auswählen.');
    return;
  }
  if (warenkorb.length === 0) {
    alert('Bitte mindestens ein Produkt in den Warenkorb legen.');
    return;
  }
  const bestellung = {
    kunde: aktuellerKunde,
    positionen: warenkorb.map(p => ({ ...p })),
    lieferdatum: document.getElementById('lieferdatum').value,
    kommentar: document.getElementById('kommentar').value,
    timestamp: Date.now() // Zeitstempel als Auftragsnummer
  };

  if (bearbeiteBestellungIndex !== null) {
    bestellungen[bearbeiteBestellungIndex] = bestellung;
    bearbeiteBestellungIndex = null;
  } else {
    bestellungen.push(bestellung);
  }

  localStorage.setItem('bestellungen', JSON.stringify(bestellungen));
  warenkorb = [];
  updateWarenkorb();
  document.getElementById('gespeicherteListe').style.display = 'none';
  updateBestellStatistik();

  // Formular zurücksetzen
  ['lieferdatum','kommentar','kundeSuche','firma','vorname','nachname','strasse','plz','ort','ustid','telefon','email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  aktuellerKunde = null;
  aktuellerKundeAnzeige.textContent = '';
  sperrhinweis.textContent = '';
  document.getElementById('land').value = 'Deutschland';
  document.getElementById('neukundeFormular').style.display = 'none';
  document.getElementById('ustid').style.display = 'none';

  alert('Bestellung gespeichert!');
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
function updateWarenkorb() {
  const liste = document.getElementById('warenkorbListe');
  const preis = document.getElementById('gesamtpreis');
  liste.innerHTML = '';
  let summe = 0;
  warenkorb.forEach((item, index) => {
    const einheit = item.Einheit || item.einheit || 'Stk';
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${item.Name || item.name}</strong> (${einheit})<br>
      <button class="red" onclick="mengeAnpassen(${index}, -1)">-</button>
      ${item.menge} × ${(item.Preis ?? item.preis).toFixed(2)} € = ${(item.menge * (item.Preis ?? item.preis)).toFixed(2)} €
      <button class="green" onclick="mengeAnpassen(${index}, 1)">+</button>
    `;
    liste.appendChild(li);
    summe += item.menge * (item.Preis ?? item.preis);
  });
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
    li.textContent = `${artikel.Name} (${artikel.Artikelnummer})`;
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
  if (container.style.display === 'block') {
    container.style.display = 'none';
    container.innerHTML = '';
  } else {
    container.style.display = 'block';
    zeigeGespeicherteBestellungen();
  }
}

function zeigeGespeicherteBestellungen() {
  const container = document.getElementById('gespeicherteListe');
  container.innerHTML = '';

  if (bestellungen.length === 0) {
    container.textContent = 'Keine gespeicherten Bestellungen gefunden.';
    return;
  }

  bestellungen.forEach((b, index) => {
    let gesamtwert = 0;
    b.positionen.forEach(p => {
      const menge = Number(p.menge) || 0;
      const preis = Number(p.Preis ?? p.preis) || 0;
      gesamtwert += menge * preis;
    });

    const div = document.createElement('div');
    div.className = 'bestellung';
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span><strong>${b.kunde.name} (${b.kunde.ort})</strong></span>
        <span><strong>${gesamtwert.toFixed(2)} €</strong></span>
        <button onclick="bearbeiteBestellung(${index})" style="margin-left: 10px;">✏️ Bearbeiten</button>
      </div>
      <hr>
    `;
    container.appendChild(div);
  });
}

function bearbeiteBestellung(index) {
  const bestellung = bestellungen[index];
  aktuellerKunde = bestellung.kunde;
  warenkorb = bestellung.positionen.map(p => ({ ...p }));
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
function formatWeclappDate(d) {
  // d: Date-Objekt!
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString().slice(-2)}/${pad(d.getHours())}/${pad(d.getSeconds())}`;
}

function exportiereBestellungenWeclapp() {
  if (!Array.isArray(bestellungen) || bestellungen.length === 0) {
    alert("Keine Bestellungen vorhanden!");
    return;
  }

  const header = [
    "AUFTRAGSNUMMER","Auftragsdatum","Geplantes Lieferdatum","Währung","Auftragsart","Zahlungsbedingungen","Versandart",
    "Lieferbedingungen","Zahlungsart","Handelssprache","Artikelnummer oder EAN","Artikelbeschreibung","MENGE","PREIS","Steuersatz",
    "Rabatt (%)","Notiz","KUNDENNUMMER","Kunden Bestellnummer","Vertriebsweg","Kommission","Firma","Firmenzusatz","Anrede","Vorname",
    "Nachname","E-Mail","Telefonnummer","Straße","Stadt","Postleitzahl","LAND","Abweichende Lieferadresse Firma",
    "Abweichende Lieferadresse Firma-Zusatz","Abweichende Lieferadresse Vorname","Abweichende Lieferadresse Nachname",
    "Abweichende Lieferadresse Straße","Abweichende Lieferadresse Postleitzahl","Abweichende Lieferadresse Stadt",
    "Abweichende Lieferadresse Land","Versandkostenartikel","Positionstyp","Geplante Arbeitszeit pro Einheit",
    "Manuelle Arbeitszeit pro Einheit","Abrechnungsart"
  ];

  const rows = [];

  bestellungen.forEach(b => {
    // Zeitstempel für AUFTRAGSNUMMER
    let zeitObjekt;
    if (b.zeitstempel) {
      zeitObjekt = new Date(b.zeitstempel);
    } else {
      zeitObjekt = new Date();
      b.zeitstempel = zeitObjekt; // Für künftige Exports merken
    }
    const auftragsnummer = formatWeclappDate(zeitObjekt);

    const kunde = b.kunde || {};
    b.positionen.forEach(p => {
      rows.push([
        auftragsnummer, // AUFTRAGSNUMMER (A)
        "", // Auftragsdatum
        b.lieferdatum || "", // Geplantes Lieferdatum (C)
        "", // Währung
        "", // Auftragsart
        "", // Zahlungsbedingungen
        "", // Versandart
        "", // Lieferbedingungen
        "", // Zahlungsart
        "", // Handelssprache
        (p.Artikelnummer || p.artikelnummer || ""), // Artikelnummer/EAN (M) – leer bei manuell
        p.Name || p.name || "", // Artikelbeschreibung
        p.menge || "", // MENGE
        p.Preis || p.preis || "", // PREIS (N)
        "", // Steuersatz
        "", // Rabatt
        b.kommentar || "", // Notiz (Q)
        (kunde.kundennummer || ""), // KUNDENNUMMER (R) – leer bei Neukunde
        "", // Kunden Bestellnummer
        "", // Vertriebsweg
        "", // Kommission
        kunde.name || "", // Firma
        "", // Firmenzusatz
        "", // Anrede
        kunde.vorname || "",
        kunde.nachname || "",
        kunde.email || "",
        kunde.telefon || "",
        kunde.strasse || "",
        kunde.ort || "",
        kunde.plz || "",
        kunde.land || "", // LAND (AF)
        "", // Abw. Lief. Firma
        "", // Abw. Lief. Firma-Zusatz
        "", // Abw. Lief. Vorname
        "", // Abw. Lief. Nachname
        "", // Abw. Lief. Straße
        "", // Abw. Lief. PLZ
        "", // Abw. Lief. Stadt
        "", // Abw. Lief. Land
        "", // Versandkostenartikel
        "", // Positionstyp
        "", // Geplante Arbeitszeit pro Einheit
        "", // Manuelle Arbeitszeit pro Einheit
        ""  // Abrechnungsart
      ]);
    });
  });

  const csv = [header, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join('\t')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "weclapp_import.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========== /WECLAPP EXPORT ==========

// Statistik beim Laden der Seite direkt anzeigen
window.addEventListener('DOMContentLoaded', () => {
  updateBestellStatistik();
  zeigeGespeicherteBestellungen();
});
