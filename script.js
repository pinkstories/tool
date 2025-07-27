// Kunden- und Artikel-Daten
let kunden = [...kundenData];
let artikel = [...artikelData];
let aktuellerKunde = null;
let warenkorb = [];
let bestellungen = JSON.parse(localStorage.getItem('bestellungen') || '[]');
let gespeicherteSichtbar = false;
let bearbeiteBestellungIndex = null; // merken, ob gerade eine Bestellung bearbeitet wird

// DOM-Elemente
const kundeSuche = document.getElementById('kundeSuche');
const suchErgebnisse = document.getElementById('suchErgebnisse');
const aktuellerKundeAnzeige = document.getElementById('aktuellerKunde');
const sperrhinweis = document.getElementById('sperrhinweis');
const ustidFeld = document.getElementById('ustid');
const landDropdown = document.getElementById('land');
const scanInput = document.getElementById('scanInput');
const artikelSuchErgebnisse = document.getElementById('artikelSuchErgebnisse');

// UStID-Feld anzeigen/verstecken je nach Land
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

// Statistik über Bestellungen
function updateBestellStatistik() {
  const container = document.getElementById('bestellStatistik');
  if (!container) return;

  let anzahl = bestellungen.length;
  let gesamt = 0;

  bestellungen.forEach(b => {
    b.positionen.forEach(p => {
      gesamt += parseFloat(p.gesamtpreis || (p.menge * (p.Preis ?? p.preis) || 0));
    });
  });

  container.textContent = `Meine Aufträge heute: ${anzahl} | Mein Umsatz heute: ${gesamt.toFixed(2)} €`;
}

// Neukunde speichern
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

// Bestellung speichern (neu oder überschreiben)
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
    positionen: warenkorb.map(p => ({
      ...p,
      gesamtpreis: (p.menge * (p.Preis ?? p.preis)).toFixed(2),
      artikelname: p.Name || p.name // falls gebraucht
    })),
    lieferdatum: document.getElementById('lieferdatum').value,
    kommentar: document.getElementById('kommentar').value
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

  document.getElementById('gespeicherteListe').style.display = 'none';

  updateBestellStatistik(); // Statistik aktualisieren

  alert('Bestellung gespeichert!');
}

// Warenkorb anzeigen/aktualisieren
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

// Menge im Warenkorb anpassen
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

// Übersicht an/aus
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

// Bestellungen anzeigen mit Bearbeiten-Button
function zeigeGespeicherteBestellungen() {
  const container = document.getElementById('gespeicherteListe');
  container.innerHTML = '';

  if (bestellungen.length === 0) {
    container.textContent = 'Keine gespeicherten Bestellungen gefunden.';
    return;
  }

  bestellungen.forEach((b, index) => {
    const div = document.createElement('div');
    div.className = 'bestellung';
    div.innerHTML = `
      <h4>Bestellung #${index + 1}</h4>
      <p><strong>Kunde:</strong> ${b.kunde.name} (${b.kunde.ort})</p>
      <p><strong>Lieferdatum:</strong> ${b.lieferdatum || '-'}</p>
      <p><strong>Kommentar:</strong> ${b.kommentar || '-'}</p>
      <ul>
        ${b.positionen.map(p => `<li>${p.menge} × ${p.artikelname || p.Name || p.name} – ${p.gesamtpreis} €</li>`).join('')}
      </ul>
      <button onclick="bearbeiteBestellung(${index})">✏️ Bearbeiten</button>
      <hr>
    `;
    container.appendChild(div);
  });
}

// Bestellung zum Bearbeiten ins Formular holen
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

// Alle Bestellungen löschen
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

// Statistik beim Laden der Seite anzeigen
window.addEventListener('DOMContentLoaded', () => {
  updateBestellStatistik();
});
