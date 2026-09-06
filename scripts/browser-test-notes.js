const puppeteer = require("puppeteer-core");
const http = require("http");
const path = require("path");
const fs = require("fs");

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

async function runBrowserNotesTest() {
  console.log("==================================================================");
  console.log("🦊 NARA — UJI OTOMATIS BROWSER: MODUL CATATAN & RICH-TEXT (FASE 5)");
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
      deviceId: "dev_notes_browser_tester",
      deviceName: "Chrome Headless Notes Tester",
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
      name: "Fisika Mekanika OSN",
      priority: "very_high",
      mode: "intensive",
      color: "#6B95F1",
    }
  );
  const subject1 = subRes.data.subject;

  // Step 3: Create Study File
  console.log("\n3. Mengunggah File Materi untuk Lampiran...");
  const boundary = "----WebKitFormBoundaryBrowserNotesTest";
  const dummySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#0f172a"/><circle cx="300" cy="200" r="100" fill="#3b82f6" opacity="0.8"/><text x="300" y="205" fill="#ffffff" font-size="20" font-family="sans-serif" text-anchor="middle">Sistem Katrol &amp; Torsi</text></svg>`;
  const multipartBody = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="diagram-katrol.svg"\r\n` +
      `Content-Type: image/svg+xml\r\n\r\n` +
      dummySvg + `\r\n` +
      `--${boundary}--\r\n`
    ),
  ]);

  const fileUploadRes = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/files",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": multipartBody.length,
          Cookie: sessionCookie,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(multipartBody);
    req.end();
  });
  const uploadedFile = fileUploadRes.data.file;

  // Step 4: Create Note 1 & Note 2
  console.log("\n4. Membuat Dua Catatan Materi untuk Ditautkan...");
  const note1Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/notes",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      title: "Hukum Newton & Dinamika Rotasi Benda Tegar",
      subject_id: subject1.id,
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Konsep Dasar Dinamika Rotasi" }],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Torsi atau momen gaya didefinisikan sebagai kecenderungan suatu gaya untuk memutar benda terhadap suatu poros putar. Hubungan fundamental:",
              },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "τ = I · α (Torsi = Momen Inersia dikali Percepatan Sudut)" }],
              },
            ],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Kekekalan momentum sudut (L = I·ω = konstan jika τ_eksternal = 0)" }] }],
              },
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Energi kinetik total: E_k = 1/2 m v^2 + 1/2 I ω^2" }] }],
              },
            ],
          },
        ],
      },
    }
  );
  const note1 = note1Res.data.note;

  // Add tags to Note 1
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}/tags`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    },
    { tag: "fisika" }
  );
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}/tags`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    },
    { tag: "rotasi" }
  );

  const note2Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/notes",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
      },
    },
    {
      title: "Osilasi Harmonik Sederhana & Bandul Fisis",
      subject_id: subject1.id,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Periode osilasi bandul fisis ditentukan oleh T = 2π √(I / (mgd))." }],
          },
        ],
      },
    }
  );
  const note2 = note2Res.data.note;

  // Link note1 to note2
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}/links`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    },
    { targetNoteId: note2.id }
  );

  // Attach file to note1
  await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/notes/${note1.id}/attachments`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    },
    { file_id: uploadedFile.id }
  );

  // Step 5: Launch Puppeteer and Test UI
  console.log("\n5. Menjalankan Headless Chrome untuk Uji Tampilan UI...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1400,900"],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  // Set session cookie in browser
  await page.setCookie({
    name: "nara_session",
    value: sessionToken,
    domain: "localhost",
    path: "/",
  });

  // Checkpoint 1: Notes Gallery Page (/dashboard/notes)
  console.log("\n6. Mengambil Checkpoint 1: Galeri Catatan (/dashboard/notes)...");
  await page.goto("http://localhost:3000/dashboard/notes", { waitUntil: "networkidle2" });
  await sleep(1500);

  const shot1Path = path.join(ARTIFACT_DIR, "screen_12_catatan_galeri.png");
  await page.screenshot({ path: shot1Path, fullPage: true });
  console.log(`   📸 Screenshot tersimpan: ${shot1Path}`);

  // Checkpoint 2: Note Detail & Rich-Text Editor (/dashboard/notes/[id])
  console.log("\n7. Mengambil Checkpoint 2: Tiptap Editor & Sidebar (/dashboard/notes/[id])...");
  await page.goto(`http://localhost:3000/dashboard/notes/${note1.id}`, { waitUntil: "networkidle2" });
  await sleep(1500);

  const shot2Path = path.join(ARTIFACT_DIR, "screen_13_catatan_editor_tiptap.png");
  await page.screenshot({ path: shot2Path, fullPage: true });
  console.log(`   📸 Screenshot tersimpan: ${shot2Path}`);

  // Checkpoint 3: Modal Lampiran Materi Dokumen
  console.log("\n8. Mengambil Checkpoint 3: Dialog Modal Lampirkan Dokumen...");
  // Click "+ Lampirkan" button to trigger modal
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes("Lampirkan"));
    if (btn) btn.click();
  });
  await sleep(1000);

  const shot3Path = path.join(ARTIFACT_DIR, "screen_14_catatan_modal_lampiran.png");
  await page.screenshot({ path: shot3Path, fullPage: true });
  console.log(`   📸 Screenshot tersimpan: ${shot3Path}`);

  await browser.close();

  console.log("\n==================================================================");
  console.log("🎉 SEMUA UJI BROWSER MODUL CATATAN (FASE 5) SELESAI!");
  console.log("==================================================================\n");
}

runBrowserNotesTest().catch((err) => {
  console.error("❌ ERROR BROWSER TEST FASE 5:", err);
  process.exit(1);
});
