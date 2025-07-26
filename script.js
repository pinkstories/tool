// Kunden- und Artikel-Daten
let kunden = [...kundenData];
let aktuellerKunde = null;
let warenkorb = [];
let bestellungen = JSON.parse(localStorage.getItem('bestellungen') || '[]');
let gespeicherteSichtbar = false;

// NEU: Merke, ob eine Bestellung gerade bearbeitet wird
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

landDropdown.addEventListener('change', () => {
  ustidFeld.style.display = (landDropdown.value !== "Deutschland") ? "block" : "none";
});

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
      gesamt += parseFloat(p.gesamtpreis || 0);
    });
  });

  container.textContent = `Gesamte Bestellungen: ${anzahl} | Gesamtbetrag: ${gesamt.toFixed(2)} €`;
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

// HINZUGEFÜGT: Bestellung bearbeiten
function bearbeiteBestellung(index) {
  bearbeiteBestellungIndex = index; // Merken, dass diese Bestellung bearbeitet wird
  const b = bestellungen[index];

  // Kunde wiederherstellen
  aktuellerKunde = b.kunde;
  aktuellerKundeAnzeige.textContent = `Kunde: ${b.kunde.name} (${b.kunde.ort})`;
  sperrhinweis.textContent = b.kunde.gesperrt ? '⚠️ Achtung: Dieser Kunde ist gesperrt!' : '';

  // Lieferdatum und Kommentar setzen
  document.getElementById('lieferdatum').value = b.lieferdatum;
  document.getElementById('kommentar').value = b.kommentar;

  // Warenkorb aus Bestellung aufbauen
  warenkorb = b.positionen.map(pos => ({
    Artikelnummer: pos.artikelnummer,
    Name: pos.artikelname,
    menge: pos.menge,
    Preis: Number(pos.preis)
  }));
  updateWarenkorb();

  // Übersicht ausblenden (optional)
  document.getElementById('gespeicherteListe').style.display = 'none';
  window.scrollTo({top:0, behavior:'smooth'});
}

function abschliessen() {
  if (!aktuellerKunde) {
    alert('Bitte zuerst einen Kunden auswählen oder erfassen!');
    return;
  }

  const lieferdatum = document.getElementById('lieferdatum').value;
  const kommentar = document.getElementById('kommentar').value;

  const neueBestellung = {
    kunde: { ...aktuellerKunde },
    lieferdatum,
    kommentar,
    zeitstempel: new Date().toISOString(),
    positionen: warenkorb.map(item => ({
      artikelnummer: item.Artikelnummer || item.artikelnummer,
      artikelname: item.Name || item.name,
      menge: item.menge,
      preis: (item.Preis ?? item.preis).toFixed(2),
      gesamtpreis: (item.menge * (item.Preis ?? item.preis)).toFixed(2)
    }))
  };

  // HINZUGEFÜGT: Überschreiben oder neue Bestellung
  if (bearbeiteBestellungIndex !== null) {
    bestellungen[bearbeiteBestellungIndex] = neueBestellung;
    bearbeiteBestellungIndex = null;
  } else {
    bestellungen.push(neueBestellung);
  }

  localStorage.setItem('bestellungen', JSON.stringify(bestellungen));

  alert('Bestellung gespeichert!');
  warenkorb = [];
  updateWarenkorb();

  ['lieferdatum','kommentar','kundeSuche','firma','vorname','nachname','strasse','plz','ort','ustid','telefon','email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

    aktuellerKundeAnzeige.textContent = '';
  sperrhinweis.textContent = '';
  aktuellerKunde = null;
  document.getElementById('land').value = 'Deutschland';
  document.getElementById('neukundeFormular').style.display = 'none';
  document.getElementById('ustid').style.display = 'none';

  document.getElementById('gespeicherteListe').style.display = 'none'; // Übersicht ausblenden!
    document.getElementById('gespeicherteListe').style.display = 'none';
  updateBestellStatistik();
}

}

function exportiereBestellungen() {
  if (bestellungen.length === 0) return alert("Keine Bestellungen vorhanden.");

  const header = ["Kunde", "Vorname", "Nachname", "Strasse", "PLZ", "Ort", "Land", "Ustid", "Telefon", "E-Mail", "Artikelnummer", "Artikelbezeichnung", "Menge", "Einzelpreis netto", "Gesamtpreis netto", "Lieferdatum", "Kommentar"];

  const rows = [];

  bestellungen.forEach(b => {
    const k = b.kunde;
    b.positionen.forEach(p => {
      rows.push([
        k.name || '', k.vorname || '', k.nachname || '', k.strasse || '', k.plz || '', k.ort || '', k.land || '', k.ustid || '', k.telefon || '', k.email || '',
        p.artikelnummer || '', p.artikelname || '', p.menge || '', p.preis || '', p.gesamtpreis || '',
        b.lieferdatum || '', b.kommentar || ''
      ]);
    });
  });

  const csv = [header, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}`.trim() + '"').join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "weclapp_bestellungen.csv";
  a.click();
  URL.revokeObjectURL(url);
}

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

// HINZUGEFÜGT: Bearbeiten-Button pro Bestellung
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
      <p><strong>Lieferdatum:</strong> ${b.lieferdatum}</p>
      <p><strong>Kommentar:</strong> ${b.kommentar || '-'}</p>
      <ul>
        ${b.positionen.map(p => `<li>${p.menge} × ${p.artikelname} – ${p.gesamtpreis} €</li>`).join('')}
      </ul>
      <button onclick="bearbeiteBestellung(${index})">✏️ Bearbeiten</button>
      <hr>
    `;
    container.appendChild(div);
  });
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
