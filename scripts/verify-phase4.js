const http = require("http");

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(body);
        } catch (e) {
          json = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on("error", reject);
    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runPhase4Verification() {
  console.log("=================================================");
  console.log("🚀 TESTING FASE 4: DIAGRAM ACTIVE RECALL (MANUAL)");
  console.log("=================================================\n");

  // Step 1: Generate Code & Activate
  console.log("1. Generating License & Activating Session...");
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

  if (genRes.status !== 201 || !genRes.data.license) {
    throw new Error("Gagal generate license code: " + JSON.stringify(genRes.data));
  }
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
      deviceId: "dev_phase4_tester",
      deviceName: "Recall Automated Test PC",
      deviceType: "desktop",
    }
  );

  if (actRes.status !== 200 || !actRes.data.success) {
    throw new Error("Gagal aktivasi sesi: " + JSON.stringify(actRes.data));
  }

  const cookieHeader = actRes.headers["set-cookie"]?.[0]?.split(";")[0];
  console.log(`✓ Sesi Aktif: ${licenseCode} (${cookieHeader})\n`);

  // Step 2: Upload Test Diagram Image
  console.log("2. Uploading Test Diagram Material (/api/files)...");
  const samplePngBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const upRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/files",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    },
    {
      fileName: "Diagram_Siklus_Krebs_Biologi.png",
      fileType: "image",
      dataUrl: samplePngBase64,
    }
  );

  if (upRes.status !== 201 || !upRes.data.file) {
    throw new Error("Gagal upload materi diagram: " + JSON.stringify(upRes.data));
  }
  const testFile = upRes.data.file;
  console.log(`✓ Diagram file created: "${testFile.file_name}" (ID: ${testFile.id})\n`);

  // Step 3: Create Diagram Labels
  console.log("3. Creating Diagram Labels (Marking critical points)...");

  // Label 1: Asetil KoA
  const label1Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/labels`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      area_x: 0.2,
      area_y: 0.15,
      area_width: 0.25,
      area_height: 0.12,
      label_text: "Asetil KoA",
      page_number: 1,
    }
  );
  if (label1Res.status !== 201) throw new Error("Gagal buat label 1: " + JSON.stringify(label1Res.data));
  const label1 = label1Res.data.label;
  console.log(`✓ Label 1 Created: "${label1.label_text}" at [${label1.area_x}, ${label1.area_y}]`);

  // Label 2: Asam Sitrat
  const label2Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/labels`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      area_x: 0.55,
      area_y: 0.3,
      area_width: 0.22,
      area_height: 0.14,
      label_text: "Asam Sitrat",
      page_number: 1,
    }
  );
  if (label2Res.status !== 201) throw new Error("Gagal buat label 2: " + JSON.stringify(label2Res.data));
  const label2 = label2Res.data.label;
  console.log(`✓ Label 2 Created: "${label2.label_text}" at [${label2.area_x}, ${label2.area_y}]`);

  // Label 3: Oksaloasetat
  const label3Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/labels`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      area_x: 0.15,
      area_y: 0.5,
      area_width: 0.28,
      area_height: 0.15,
      label_text: "Oksaloasetat",
      page_number: 1,
    }
  );
  if (label3Res.status !== 201) throw new Error("Gagal buat label 3: " + JSON.stringify(label3Res.data));
  const label3 = label3Res.data.label;
  console.log(`✓ Label 3 Created: "${label3.label_text}" at [${label3.area_x}, ${label3.area_y}]\n`);

  // Step 4: Verify Labels Retrieval
  console.log("4. Fetching Labels via GET /api/files/[id]/labels...");
  const listLabelsRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${testFile.id}/labels`,
    method: "GET",
    headers: { Cookie: cookieHeader },
  });
  const fetchedLabels = listLabelsRes.data.labels || [];
  console.log(`✓ Total labels fetched: ${fetchedLabels.length}`);
  if (fetchedLabels.length !== 3) throw new Error("Expected exactly 3 labels, got " + fetchedLabels.length);

  // Step 5: Verify Active Recall Stats Initial State
  console.log("\n5. Checking Initial Recall Stats via GET /api/files/[id]/recall...");
  const initialRecallRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${testFile.id}/recall`,
    method: "GET",
    headers: { Cookie: cookieHeader },
  });
  console.log(`✓ Initial Stats: Total = ${initialRecallRes.data.totalLabels}, Mastered = ${initialRecallRes.data.masteredLabels}, AllMastered = ${initialRecallRes.data.allMastered}`);
  if (initialRecallRes.data.totalLabels !== 3) throw new Error("totalLabels should be 3");
  if (initialRecallRes.data.masteredLabels !== 0) throw new Error("masteredLabels should initially be 0");
  if (initialRecallRes.data.allMastered !== false) throw new Error("Initial allMastered should be false");

  // Step 6: Test Auto-Grading (Case-Insensitive & Trim)
  console.log("\n6. Testing Auto-Grading (Guessing Label 1 & Label 2)...");
  // Exact match with whitespace and lowercasing
  const guessCorrectRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/recall`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      labelId: label1.id,
      userAnswer: "   asetil koa   ",
    }
  );
  console.log(`✓ Guess "   asetil koa   " for "Asetil KoA": correct = ${guessCorrectRes.data.correct}, masteredLabels = ${guessCorrectRes.data.masteredLabels}`);
  if (guessCorrectRes.data.correct !== true) throw new Error("Expected correct === true for case-insensitive match");
  if (guessCorrectRes.data.masteredLabels !== 1) throw new Error("masteredLabels should be 1");

  // Incorrect answer for Label 2
  const guessWrongRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/recall`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      labelId: label2.id,
      userAnswer: "Glukosa",
    }
  );
  console.log(`✓ Guess "Glukosa" for "Asam Sitrat": correct = ${guessWrongRes.data.correct}, masteredLabels = ${guessWrongRes.data.masteredLabels}`);
  if (guessWrongRes.data.correct !== false) throw new Error("Expected correct === false for wrong guess");

  // Step 7: Test Manual Self-Grading ("Saya Benar" / "Saya Salah")
  console.log("\n7. Testing Manual Self-Grading...");
  // Re-attempt Label 2 with manual "Saya Benar"
  const selfGradeRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/recall`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      labelId: label2.id,
      isCorrect: true,
    }
  );
  console.log(`✓ Self-Grade Label 2 as correct: correct = ${selfGradeRes.data.correct}, masteredLabels = ${selfGradeRes.data.masteredLabels}`);
  if (selfGradeRes.data.correct !== true) throw new Error("Expected isCorrect: true");
  if (selfGradeRes.data.masteredLabels !== 2) throw new Error("masteredLabels should be 2");

  // Attempt Label 3 with manual "Saya Benar" to achieve 100% mastery!
  const finalGradeRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: `/api/files/${testFile.id}/recall`,
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
    },
    {
      labelId: label3.id,
      isCorrect: true,
    }
  );
  console.log(`✓ Self-Grade Label 3 as correct: Mastered = ${finalGradeRes.data.masteredLabels}/${finalGradeRes.data.totalLabels}, AllMastered = ${finalGradeRes.data.allMastered}`);
  if (!finalGradeRes.data.allMastered) throw new Error("Expected allMastered === true when all labels are correct");

  // Step 8: Test Label Deletion
  console.log("\n8. Testing DELETE /api/files/[id]/labels/[labelId]...");
  const deleteRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${testFile.id}/labels/${label3.id}`,
    method: "DELETE",
    headers: { Cookie: cookieHeader },
  });
  console.log(`✓ Deleted Label 3: status = ${deleteRes.status}, success = ${deleteRes.data.success}`);
  if (deleteRes.status !== 200) throw new Error("Failed to delete label");

  // Verify remaining count
  const remainingRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/files/${testFile.id}/labels`,
    method: "GET",
    headers: { Cookie: cookieHeader },
  });
  console.log(`✓ Remaining labels: ${remainingRes.data.labels.length} (expected 2)`);
  if (remainingRes.data.labels.length !== 2) throw new Error("Expected 2 labels after deletion");

  console.log("\n=================================================");
  console.log("🎉 FASE 4 API VERIFICATION PASSED 100% SUCCESSFULLY!");
  console.log("=================================================\n");
}

runPhase4Verification().catch((err) => {
  console.error("❌ FASE 4 VERIFICATION FAILED:", err);
  process.exit(1);
});
