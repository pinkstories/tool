let kunden = [...kundenData]; // aus KundenData.js
let aktuellerKunde = null;
let warenkorb = [];
let bestellungen = [];

const kundeSuche = document.getElementById('kundeSuche');
const suchErgebnisse = document.getElementById('suchErgebnisse');
const aktuellerKundeAnzeige = document.getElementById('aktuellerKunde');
const sperrhinweis = document.getElementById('sperrhinweis');
const ustidFeld = document.getElementById('ustid');
const landDropdown = document.getElementById('land');

// USt-ID-Feld nur bei EU-Ausland anzeigen
landDropdown.addEventListener('change', () => {
  const land = landDropdown.value;
  ustidFeld.style.display = (land !== "Deutschland") ? "block" : "none";
});

// Kundensuche
kundeSuche.addEventListener('input', () => {
  const query = kundeSuche.value.toLowerCase().trim();
  suchErgebnisse.innerHTML = '';
  if (query.length === 0) return;

  const treffer = kunden.filter(k =>
    k.name.toLowerCase().includes(query) || (k.ort && k.ort.toLowerCase().includes(query))
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

// Neukunde speichern
function neukundeSpeichern() {
  const firma = document.getElementById('firma').value.trim();
  const vorname = document.getElementById('vorname').value.trim();
  const nachname = document.getElementById('nachname').value.trim();
  const strasse = document.getElementById('strasse').value.trim();
  const plz = document.getElementById('plz').value.trim();
  const ort = document.getElementById('ort').value.trim();
  const land = document.getElementById('land').value.trim();
  const ustid = document.getElementById('ustid').value.trim();
  const telefon = document.getElementById('telefon').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!firma || !vorname || !nachname || !strasse || !plz || !ort || !telefon || !email) {
    alert('Bitte alle Pflichtfelder ausfüllen.');
    return;
  }
  if (land !== "Deutschland" && ustidFeld.style.display === "block" && ustid === "") {
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
  aktuellerKundeAnzeige.textContent = `Neukunde: ${firma} (${ort})`;
  sperrhinweis.textContent = '';
  document.getElementById('neukundeFormular').style.display = 'none';
}

// Warenkorb aktualisieren
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
      ${item.menge} × ${item.Preis !== undefined ? item.Preis.toFixed(2) : item.preis.toFixed(2)} € = ${(item.menge * (item.Preis !== undefined ? item.Preis : item.preis)).toFixed(2)} €
      <button class="green" onclick="mengeAnpassen(${index}, 1)">+</button>
    `;
    liste.appendChild(li);
    summe += item.menge * (item.Preis !== undefined ? item.Preis : item.preis);
  });
  preis.textContent = 'Gesamt: ' + summe.toFixed(2) + ' €';
}

// Warenkorb-Menge ändern
function mengeAnpassen(index, richtung) {
  const artikel = warenkorb[index];
  const einheitMenge = artikel.Einheit || artikel.einheit || 1;
  artikel.menge += richtung * einheitMenge;
  if (artikel.menge < einheitMenge) {
    warenkorb.splice(index, 1);
  }
  updateWarenkorb();
}

// Artikel scannen/hinzufügen
document.getElementById('scanInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const nummer = e.target.value.trim();
    const artikel = ArtikelData.find(a =>
      String(a.Artikelnummer || a.artikelnummer) === nummer
    );
    if (!artikel) {
      alert('Artikel nicht gefunden.');
      return;
    }
    const vielfaches = artikel.Einheit || artikel.einheit || 1;
    const vorhandener = warenkorb.find(w =>
      String(w.Artikelnummer || w.artikelnummer) === nummer
    );
    if (vorhandener) {
      vorhandener.menge += vielfaches;
    } else {
      warenkorb.push({ ...artikel, menge: vielfaches });
    }
    updateWarenkorb();
    e.target.value = '';
  }
});

// Bestellung speichern
function abschliessen() {
  if (!aktuellerKunde) {
    alert('Bitte zuerst einen Kunden auswählen oder erfassen!');
    return;
  }

  const lieferdatum = document.getElementById('lieferdatum').value;
  const kommentar = document.getElementById('kommentar').value;

  const daten = warenkorb.map(item => {
    return {
      kundenname: aktuellerKunde.name,
      ort: aktuellerKunde.ort,
      artikelnummer: item.Artikelnummer || item.artikelnummer,
      artikelname: item.Name || item.name,
      menge: item.menge,
      preis: (item.Preis !== undefined ? item.Preis : item.preis).toFixed(2),
      gesamtpreis: (item.menge * (item.Preis !== undefined ? item.Preis : item.preis)).toFixed(2),
      lieferdatum,
      kommentar,
      zeitstempel: new Date().toISOString()
    };
  });

  bestellungen.push(...daten);
  alert('Bestellung gespeichert!');
  warenkorb = [];
  updateWarenkorb();
}

// Bestellungen als CSV exportieren
function exportiereBestellungen() {
  if (bestellungen.length === 0) {
    alert("Keine gespeicherten Bestellungen zum Exportieren.");
    return;
  }
  const rows = bestellungen.map(obj => [
    obj.kundenname,
    obj.ort,
    obj.artikelnummer,
    obj.artikelname,
    obj.menge,
    obj.preis,
    obj.gesamtpreis,
    obj.lieferdatum,
    obj.kommentar
  ]);
  const header = [
    "Kunde","Ort","Artikelnummer","Artikelbezeichnung","Menge",
    "Einzelpreis netto","Gesamtpreis netto","Lieferdatum","Kommentar"
  ];
  const csv = [header, ...rows].map(row =>
    row.map(field => typeof field === "string" ? "\""+field.replace(/"/g, '""')+"\"" : field)
      .join(";")
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "weclapp_bestellungen.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Noch nicht implementiert:
function zeigeGespeicherteBestellungen() {
  alert('Funktion noch nicht implementiert.');
}
