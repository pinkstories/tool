let kunden = [...kundenData]; // aus KundenData.js
let aktuellerKunde = null;
let warenkorb = [];
let bestellungen = JSON.parse(localStorage.getItem('bestellungen') || '[]');
let gespeicherteSichtbar = false;

// DOM-Elemente
const kundeSuche = document.getElementById('kundeSuche');
const suchErgebnisse = document.getElementById('suchErgebnisse');
const aktuellerKundeAnzeige = document.getElementById('aktuellerKunde');
const sperrhinweis = document.getElementById('sperrhinweis');
const ustidFeld = document.getElementById('ustid');
const landDropdown = document.getElementById('land');
const scanInput = document.getElementById('scanInput');
const artikelSuchErgebnisse = document.getElementById('artikelSuchErgebnisse');

// USt-ID-Feld nur bei EU-Ausland anzeigen
landDropdown.addEventListener('change', () => {
  ustidFeld.style.display = (landDropdown.value !== "Deutschland") ? "block" : "none";
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
      ${item.menge} × ${(item.Preis ?? item.preis).toFixed(2)} € = ${(item.menge * (item.Preis ?? item.preis)).toFixed(2)} €
      <button class="green" onclick="mengeAnpassen(${index}, 1)">+</button>
    `;
    liste.appendChild(li);
    summe += item.menge * (item.Preis ?? item.preis);
  });
  preis.textContent = 'Gesamt: ' + summe.toFixed(2) + ' €';
}

// Menge anpassen
function mengeAnpassen(index, richtung) {
  const artikel = warenkorb[index];
  const einheitMenge = artikel.Einheit || artikel.einheit || 1;
  artikel.menge += richtung * einheitMenge;
  if (artikel.menge < einheitMenge) {
    warenkorb.splice(index, 1);
  }
  updateWarenkorb();
}

// Artikelsuche
scanInput.addEventListener('input', () => {
  const query = scanInput.value.trim().toLowerCase();
  artikelSuchErgebnisse.innerHTML = '';
  if (!query) return;

  const treffer = ArtikelData.filter(a =>
    (a.Name && a.Name.toLowerCase().includes(query)) ||
    (a.Artikelnummer && String(a.Artikelnummer).toLowerCase().includes(query))
  );

  if (treffer.length === 1 && String(treffer[0].Artikelnummer) === query) return;

  treffer.slice(0, 30).forEach(artikel => {
    const li = document.createElement('li');
    li.textContent = `${artikel.Name} (${artikel.Artikelnummer})`;
    li.style.cursor = 'pointer';
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

// ENTER für Artikelfeld
scanInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const eingabe = scanInput.value.trim();
    const artikel = ArtikelData.find(a =>
      String(a.Artikelnummer) === eingabe
    );
    if (artikel) {
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
      artikelSuchErgebnisse.innerHTML = '';
    } else if (artikelSuchErgebnisse.children.length > 0) {
      artikelSuchErgebnisse.firstChild.click();
    } else {
      alert('Artikel nicht gefunden.');
    }
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

  const daten = warenkorb.map(item => ({
    kundenname: aktuellerKunde.name,
    ort: aktuellerKunde.ort,
    artikelnummer: item.Artikelnummer || item.artikelnummer,
    artikelname: item.Name || item.name,
    menge: item.menge,
    preis: (item.Preis ?? item.preis).toFixed(2),
    gesamtpreis: (item.menge * (item.Preis ?? item.preis)).toFixed(2),
    lieferdatum,
    kommentar,
    zeitstempel: new Date().toISOString()
  }));

  bestellungen.push(...daten);
  localStorage.setItem('bestellungen', JSON.stringify(bestellungen));

  alert('Bestellung gespeichert!');
  warenkorb = [];
  updateWarenkorb();

  // Formular zurücksetzen
  document.getElementById('lieferdatum').value = '';
  document.getElementById('kommentar').value = '';
  kundeSuche.value = '';
  aktuellerKundeAnzeige.textContent = '';
  sperrhinweis.textContent = '';
  aktuellerKunde = null;

  // Neukundenformular zurücksetzen
  ['firma','vorname','nachname','strasse','plz','ort','ustid','telefon','email'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('land').value = 'Deutschland';
  document.getElementById('neukundeFormular').style.display = 'none';
  document.getElementById('ustid').style.display = 'none';
}

// Export als CSV
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
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(";")
  ).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "weclapp_bestellungen.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Alle löschen
function loescheAlleBestellungen() {
  if (confirm("Alle gespeicherten Bestellungen unwiderruflich löschen?")) {
    bestellungen = [];
    localStorage.removeItem('bestellungen');
    document.getElementById("gespeicherteListe").innerHTML = "";
    gespeicherteSichtbar = false;
    alert("Alle Bestellungen gelöscht!");
  }
}

// Anzeige togglen
function toggleGespeicherteBestellungen() {
  const listDiv = document.getElementById("gespeicherteListe");
  if (gespeicherteSichtbar) {
    listDiv.innerHTML = "";
    gespeicherteSichtbar = false;
  } else {
    zeigeGespeicherteBestellungen();
    gespeicherteSichtbar = true;
  }
}

// Gespeicherte anzeigen
function zeigeGespeicherteBestellungen() {
  const listDiv = document.getElementById("gespeicherteListe");
  listDiv.innerHTML = "<h4>📁 Gespeicherte Bestellungen:</h4>";

  if (bestellungen.length === 0) {
    listDiv.innerHTML += "<p>Keine gespeicherten Bestellungen.</p>";
    return;
  }

  bestellungen.forEach((b, i) => {
    const wrap = document.createElement("div");
    wrap.style.margin = "0.25rem 0";
    wrap.style.padding = "0.5rem";
    wrap.style.border = "1px solid #eee";
    wrap.style.borderRadius = "6px";
    wrap.style.background = "#f9f9f9";
    wrap.style.fontSize = "0.97rem";

    wrap.innerHTML = `
      <b>${b.kundenname}</b> (${b.ort})<br>
      <span style="color:#333;">${b.artikelname} (${b.artikelnummer})</span> – Menge: <b>${b.menge}</b><br>
      Einzelpreis: ${b.preis} €, Gesamt: <b>${b.gesamtpreis} €</b><br>
      Lieferdatum: <b>${b.lieferdatum || "-"}</b><br>
      Kommentar: ${b.kommentar || "-"}<br>
      <small style="color:#888;">${b.zeitstempel || ""}</small>
    `;

    const del = document.createElement("button");
    del.textContent = "🗑️ Löschen";
    del.className = "red";
    del.style.marginTop = "5px";
    del.onclick = () => {
      if (confirm("Bestellung wirklich löschen?")) {
        bestellungen.splice(i, 1);
        localStorage.setItem('bestellungen', JSON.stringify(bestellungen));
        zeigeGespeicherteBestellungen();
      }
    };
    wrap.appendChild(del);
    listDiv.appendChild(wrap);
  });
}
