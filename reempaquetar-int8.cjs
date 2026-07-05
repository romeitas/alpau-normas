const fs = require("fs");
const crypto = require("crypto");
const REPO = "C:\\Proyectos\\alpau-normas";
const APPKB = "C:\\Proyectos\\ALPAU-AGENTE-IA\\knowledge-base\\modules";
const manifest = JSON.parse(fs.readFileSync(REPO + "\\manifest.json", "utf8"));
const porArea = {};
let regenerados = 0, problemas = 0;
for (const m of manifest.normas) {
  if (!porArea[m.area]) porArea[m.area] = JSON.parse(fs.readFileSync(APPKB + "\\" + m.area + "\\items.json", "utf8"));
  const articulos = porArea[m.area].filter(x => x.metadata && x.metadata.source === m.source);
  if (articulos.length === 0) { console.log("PROBLEMA " + m.source + ": 0 articulos en el corpus de la app"); problemas++; continue; }
  const floats = articulos.filter(a => Array.isArray(a.vector)).length;
  if (floats > 0) { console.log("PROBLEMA " + m.source + ": " + floats + " vectores float (no int8) en el corpus"); problemas++; continue; }
  const viejo = JSON.parse(fs.readFileSync(REPO + "\\" + m.archivo, "utf8"));
  const pack = { source: m.source, normaId: m.normaId, area: m.area, titulo: viejo.titulo, fecha_referencia: m.fecha_referencia, numItems: articulos.length, articulos: articulos };
  const cuerpo = JSON.stringify(pack);
  const tmp = REPO + "\\" + m.archivo + ".tmp";
  fs.writeFileSync(tmp, cuerpo, "utf8");
  fs.renameSync(tmp, REPO + "\\" + m.archivo);
  m.sha256 = crypto.createHash("sha256").update(cuerpo, "utf8").digest("hex");
  const cambio = m.numItems !== articulos.length ? (" (numItems " + m.numItems + " -> " + articulos.length + ")") : "";
  m.numItems = articulos.length;
  console.log("ok " + m.archivo + ": " + articulos.length + " articulos int8" + cambio);
  regenerados++;
}
manifest.fecha_publicacion = new Date().toISOString();
const tmpM = REPO + "\\manifest.json.tmp";
fs.writeFileSync(tmpM, JSON.stringify(manifest, null, 2), "utf8");
fs.renameSync(tmpM, REPO + "\\manifest.json");
console.log("");
console.log("Regenerados: " + regenerados + "/" + manifest.normas.length + " | Problemas: " + problemas);
console.log("--- Verificacion final ---");
const chk = JSON.parse(fs.readFileSync(REPO + "\\norma-fiscal-LIP.json", "utf8"));
console.log("A. LIP vector tipo: " + (typeof chk.articulos[0].vector === "string" ? "BASE64 (int8) OK" : "FLOAT - MAL"));
console.log("B. LIP sha coincide con manifest: " + (crypto.createHash("sha256").update(JSON.stringify(chk), "utf8").digest("hex") === manifest.normas.find(n => n.source === "LIP").sha256));
console.log("C. CodigoCivil peso: " + (fs.statSync(REPO + "\\norma-civil-CodigoCivil.json").size / 1048576).toFixed(1) + " MB (antes 16.2 - debe bajar mucho)");