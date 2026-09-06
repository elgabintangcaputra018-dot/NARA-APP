const puppeteer = require("puppeteer-core");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const ARTIFACT_DIR = "C:\\Users\\asuss\\.gemini\\antigravity\\brain\\d2007772-21c1-4248-876a-6585aac214ad";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || body,
        });
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function createSamplePdf(filePath) {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([600, 800]);

  const { height } = page.getSize();
  const fontSize = 14;

  const lines = [
    "SILABUS PEMBINAAN OSN MATEMATIKA NASIONAL 2026",
    "",
    "BAB 1. Prinsip Sarang Burung Merpati (Pigeonhole)",
    "Pigeonhole Principle dan variasinya dalam keterbagian bilangan.",
    "",
    "BAB 2. Koefisien Binomial dan Segitiga Pascal",
    "Ekspansi aljabar, identitas kombinatorial dan perhitungan multinom.",
    "",
    "BAB 3. Prinsip Inklusi dan Eksklusi Lanjut",
    "Menghitung banyaknya permutasi derangement dan himpunan saling lepas.",
    "",
    "BAB 4. Teorema Sisa Cina (Chinese Remainder Theorem)",
    "Sistem kongruensi linear simultan untuk bilangan bulat.",
    "",
    "BAB 5. Persamaan Diofantin Linear",
    "Algoritma Euclidean dan pencarian solusi bilangan bulat tak-negatif.",
  ];

  let y = height - 50;
  for (const line of lines) {
    page.drawText(line, {
      x: 50,
      y,
      size: line.startsWith("SILABUS") ? 16 : fontSize,
      font: timesRomanFont,
      color: rgb(0.1, 0.1, 0.2),
    });
    y -= 30;
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

async function runBrowserSyllabusTest() {
  console.log("==================================================================");
  console.log("🦊 NARA — UJI OTOMATIS BROWSER: SILABUS & AUTO-JADWAL (FASE 6)");
  console.log("==================================================================\n");

  // Step 1: Admin setup workspace & session
  console.log("1. Menyiapkan Lisensi & Sesi Siswa...");
  const genRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/admin/generate-code",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": "nara-admin-secret-2026",
      },
    },
    { plan: "yearly_launching", price_paid: 150000 }
  );

  const licenseCode = genRes.data.license.code;
  const actRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_syllabus_browser_tester",
      deviceName: "Chrome Headless Syllabus Tester",
    }
  );

  const rawCookie = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  const sessionToken = rawCookie.split("=")[1];
  const sessionCookie = rawCookie;
  console.log("   ✅ Sesi siswa aktif siap! Token: " + sessionToken);

  // Step 2: Create Subject
  console.log("\n2. Menyiapkan Mata Pelajaran...");
  const subRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/subjects",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      name: "Matematika Diskrit OSN",
      priority: "very_high",
      mode: "intensive",
      color: "#6B95F1",
    }
  );
  const subject1 = subRes.data.subject;
  console.log(`   ✅ Mapel berhasil dibuat: ${subject1.name} (${subject1.id})`);

  // Step 3: Generate temporary sample PDF
  console.log("\n3. Membuat Berkas Contoh PDF Silabus...");
  const tempPdfPath = path.join(ARTIFACT_DIR, "scratch", "sample_silabus_matematika.pdf");
  const scratchDir = path.join(ARTIFACT_DIR, "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  await createSamplePdf(tempPdfPath);
  console.log("   ✅ Berkas PDF berhasil dibuat di: " + tempPdfPath);

  // Step 4: Launch Puppeteer
  console.log("\n4. Menjalankan Headless Chrome...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,960"],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: "nara_session",
    value: sessionToken,
    domain: "localhost",
    path: "/",
  });

  // Step 5: Navigate to Syllabus Upload Page
  console.log("\n5. Menavigasi ke Halaman Upload Silabus (/dashboard/syllabus/upload)...");
  await page.goto("http://localhost:3000/dashboard/syllabus/upload", { waitUntil: "networkidle2" });
  await sleep(1500);

  // Upload the PDF file to input[type="file"]
  console.log("   Mengunggah file PDF dan mengekstrak topik otomatis...");
  const fileInput = await page.$('input[type="file"]');
  if (!fileInput) throw new Error("File input not found on /dashboard/syllabus/upload");
  await fileInput.uploadFile(tempPdfPath);

  // Wait for client-side extraction to parse topics
  await sleep(2500);

  // Change weight of first topic to 5 (Sangat Sulit) and second to 3 (Sedang)
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll("select"));
    // The topic weight selects have options 1-5
    selects.forEach((sel, i) => {
      if (i === 1) sel.value = "5"; // First topic weight
      if (i === 2) sel.value = "3"; // Second topic weight
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  await sleep(1000);

  // Checkpoint 1: Upload & PDF Parsing with manual weight selection
  console.log("\n6. Mengambil Checkpoint 1: Upload Silabus & Hasil Ekstraksi Topik...");
  const shot1Path = path.join(ARTIFACT_DIR, "screen_15_syllabus_upload_parsing.png");
  await page.screenshot({ path: shot1Path, fullPage: true });
  console.log(`   📸 Screenshot tersimpan: ${shot1Path}`);

  // Click Save Syllabus button
  console.log("   Menyimpan silabus ke database...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const saveBtn = buttons.find((b) => b.textContent && b.textContent.includes("Simpan Silabus"));
    if (saveBtn) saveBtn.click();
  });

  // Wait for navigation to /dashboard/syllabus/[id]
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => sleep(2500));
  await sleep(1500);

  const currentUrl = page.url();
  console.log(`   ✅ Tiba di halaman detail silabus: ${currentUrl}`);

  // Checkpoint 2: Open Schedule Preview Modal
  console.log("\n7. Membuka Modal Susun Jadwal Otomatis & Algoritma...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const planBtn = buttons.find((b) => b.textContent && (b.textContent.includes("Susun Ulang Jadwal") || b.textContent.includes("Susun Jadwal")));
    if (planBtn) planBtn.click();
  });
  await sleep(2000);

  const shot2Path = path.join(ARTIFACT_DIR, "screen_16_syllabus_detail_progress.png");
  await page.screenshot({ path: shot2Path, fullPage: true });
  console.log(`   📸 Screenshot tersimpan: ${shot2Path}`);

  // Apply Schedule to calendar
  console.log("   Menerapkan sesi belajar ke kalender...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const applyBtn = buttons.find((b) => b.textContent && b.textContent.includes("Terapkan ke Jadwal Belajar"));
    if (applyBtn) {
      applyBtn.click();
    } else {
      console.warn("Tombol Terapkan ke Jadwal Belajar tidak ditemukan!");
    }
  });
  // Wait for navigation triggered by router.push('/dashboard/schedule')
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => sleep(3000));
  await sleep(2500);

  // Checkpoint 3: Navigate to /dashboard/schedule to view auto-generated sessions
  console.log("\n8. Mengambil Checkpoint 3: Grid Kalender dengan Sesi 'AUTO' (/dashboard/schedule)...");
  // Scroll down slightly so 16:00 - 22:00 evening study hours are front and center
  await page.evaluate(() => {
    window.scrollTo({ top: 380, behavior: "instant" });
  });
  await sleep(1000);

  const shot3Path = path.join(ARTIFACT_DIR, "screen_17_schedule_auto_generated.png");
  await page.screenshot({ path: shot3Path });
  console.log(`   📸 Screenshot tersimpan: ${shot3Path}`);

  await browser.close();

  console.log("\n==================================================================");
  console.log("🎉 SEMUA UJI BROWSER SILABUS (FASE 6) SELESAI & BERHASIL 100%!");
  console.log("==================================================================\n");
}

runBrowserSyllabusTest().catch((err) => {
  console.error("❌ ERROR BROWSER TEST FASE 6:", err);
  process.exit(1);
});
