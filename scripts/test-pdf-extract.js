const pdfjs = require("c:/NARA APP/node_modules/pdfjs-dist/legacy/build/pdf");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

async function testExtraction() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([600, 800]);
  const sampleContent = [
    "SILABUS OSN FISIKA TINGKAT NASIONAL",
    "",
    "BAB 1: KINEMATIKA GERAK LURUS DAN MELENGKUNG",
    "1.1 Gerak Satu Dimensi dan Analisis Vektor",
    "1.2 Gerak Parabola dan Koordinat Polar",
    "1.3 Gerak Melingkar Beraturan",
    "",
    "BAB 2: DINAMIKA PARTIKEL DAN HUKUM NEWTON",
    "2.1 Hukum Gravitasi Universal",
    "2.2 Gaya Gesek Statis dan Kinetis",
    "",
    "BAB 3: USAHA, ENERGI, DAN MOMENTUM",
    "3.1 Teorema Usaha-Energi",
    "3.2 Tumbukan dan Kekekalan Momentum",
  ].join("\n");

  page.drawText(sampleContent, {
    x: 50,
    y: 750,
    size: 11,
    font: font,
    color: rgb(0, 0, 0),
    lineHeight: 20,
  });

  const pdfBytes = await pdfDoc.save();

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBytes) });
  const doc = await loadingTask.promise;
  console.log(`PDF Loaded! Pages: ${doc.numPages}`);

  let fullText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const content = await p.getTextContent();
    const pageText = content.items.map((item) => item.str).join("\n");
    fullText += pageText + "\n";
  }

  console.log("--- Extracted Raw Text ---");
  console.log(fullText.trim());

  const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);
  const detectedTopics = [];

  const chapterRegex = /^(BAB|CHAPTER|BAGIAN)\s+([0-9IVXLCDM]+)[\s:.\-]+(.*)$/i;
  const subtopicRegex = /^([0-9]+\.[0-9]+(\.[0-9]+)?)\s+[\-–:.]?\s*(.*)$/;
  const numberedListRegex = /^([0-9]+|[A-Z])[\.\)]\s+(.*)$/;

  for (const line of lines) {
    if (chapterRegex.test(line)) {
      detectedTopics.push({ title: line, weight: 3, estimated_minutes: 60 });
    } else if (subtopicRegex.test(line)) {
      detectedTopics.push({ title: line, weight: 3, estimated_minutes: 45 });
    } else if (numberedListRegex.test(line)) {
      detectedTopics.push({ title: line, weight: 3, estimated_minutes: 45 });
    }
  }

  console.log(`\nDetected ${detectedTopics.length} topics:`);
  detectedTopics.forEach((t, idx) => console.log(`  ${idx + 1}. [${t.estimated_minutes}m] ${t.title}`));
}

testExtraction().catch(console.error);
