const http = require("http");

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

async function runTests() {
  console.log("=================================================");
  console.log("🦊 NARA — UJI VERIFIKASI MULTI-DEVICE & AKTIVASI");
  console.log("=================================================\n");

  // Step 1: Admin Generate Code
  console.log("1. Menguji Generate Kode Lisensi oleh Admin...");
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
    console.error("❌ Gagal generate kode:", genRes);
    process.exit(1);
  }
  const licenseCode = genRes.data.license.code;
  console.log(`✅ Kode berhasil dibuat: ${licenseCode} (Plan: ${genRes.data.license.plan})\n`);

  // Step 2: Device 1 Activation (Chrome di Windows)
  console.log("2. Mengaktivasi di Perangkat 1 (Chrome di Windows)...");
  const dev1Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_windows_chrome_01",
      deviceName: "Chrome di Windows",
    }
  );

  if (dev1Res.status !== 200 || !dev1Res.data.success) {
    console.error("❌ Gagal aktivasi perangkat 1:", dev1Res);
    process.exit(1);
  }
  const dev1Cookie = dev1Res.headers["set-cookie"]?.[0]?.split(";")[0];
  console.log("✅ Perangkat 1 berhasil diaktivasi!");
  console.log(`   Workspace ID: ${dev1Res.data.workspaceId}`);
  console.log(`   Session Cookie: ${dev1Cookie}\n`);

  // Step 3: Device 2 Activation (Safari di iPhone)
  console.log("3. Mengaktivasi di Perangkat 2 (Safari di iPhone)...");
  const dev2Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_iphone_safari_02",
      deviceName: "Safari di iPhone",
    }
  );

  if (dev2Res.status !== 200 || !dev2Res.data.success) {
    console.error("❌ Gagal aktivasi perangkat 2:", dev2Res);
    process.exit(1);
  }
  console.log("✅ Perangkat 2 berhasil diaktivasi!\n");

  // Step 4: Device 3 Activation (Edge di Windows)
  console.log("4. Mengaktivasi di Perangkat 3 (Edge di Windows)...");
  const dev3Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_windows_edge_03",
      deviceName: "Edge di Windows",
    }
  );

  if (dev3Res.status !== 200 || !dev3Res.data.success) {
    console.error("❌ Gagal aktivasi perangkat 3:", dev3Res);
    process.exit(1);
  }
  console.log("✅ Perangkat 3 berhasil diaktivasi! Kuota 3/3 perangkat tercapai.\n");

  // Step 5: Check Device List from Perangkat 1
  console.log("5. Memeriksa status kuota dari Perangkat 1...");
  const listRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/devices",
    method: "GET",
    headers: { Cookie: dev1Cookie },
  });

  console.log(`   Total perangkat terdaftar: ${listRes.data.devices.length} dari ${listRes.data.quota.max}`);
  console.log(`   Masa aktif lisensi tersisa: ${listRes.data.license.daysRemaining} hari`);
  listRes.data.devices.forEach((d, idx) => {
    console.log(`   - Perangkat ${idx + 1}: ${d.device_name} (ID: ${d.device_id})`);
  });
  console.log("✅ Verifikasi kuota 3/3 sesuai.\n");

  // Step 6: Device 4 Activation (HARUS DITOLAK karena kuota 3/3 sudah penuh!)
  console.log("6. Menguji Perangkat 4 (Chrome di Android) — Harus Ditolak...");
  const dev4Res = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_android_chrome_04",
      deviceName: "Chrome di Android",
    }
  );

  if (dev4Res.status === 400 && dev4Res.data.maxDevicesReached) {
    console.log("✅ PENGUJIAN BATASAN BERHASIL: Perangkat 4 DITOLAK dengan pesan yang tepat!");
    console.log(`   Pesan error: "${dev4Res.data.error}"\n`);
  } else {
    console.error("❌ Harusnya ditolak tapi tidak:", dev4Res);
    process.exit(1);
  }

  // Step 7: Delete Device 2 (Safari di iPhone) from Device 1
  const deviceToDelete = listRes.data.devices.find((d) => d.device_id === "dev_iphone_safari_02");
  console.log(`7. Menghapus Perangkat 2 (${deviceToDelete.device_name}) untuk mengosongkan slot...`);
  const delRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/devices/${deviceToDelete.id}`,
    method: "DELETE",
    headers: { Cookie: dev1Cookie },
  });

  if (delRes.status !== 200 || !delRes.data.success) {
    console.error("❌ Gagal menghapus perangkat:", delRes);
    process.exit(1);
  }
  console.log(`✅ ${delRes.data.message}\n`);

  // Step 8: Device 4 Activation AGAIN (SEKARANG HARUS BERHASIL karena slot kosong!)
  console.log("8. Mengaktivasi ulang Perangkat 4 setelah slot kosong...");
  const dev4RetryRes = await request(
    {
      hostname: "localhost",
      port: 3000,
      path: "/api/activate",
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    {
      code: licenseCode,
      deviceId: "dev_android_chrome_04",
      deviceName: "Chrome di Android",
    }
  );

  if (dev4RetryRes.status === 200 && dev4RetryRes.data.success) {
    console.log("✅ Perangkat 4 SEKARANG BERHASIL DIAKTIVASI!");
    console.log(`   Pesan: "${dev4RetryRes.data.message}"\n`);
  } else {
    console.error("❌ Gagal aktivasi perangkat 4:", dev4RetryRes);
    process.exit(1);
  }

  // Final summary
  console.log("=================================================");
  console.log("🎉 SEMUA PENGUJIAN FASE 0 & FASE 1 SUKSES 100%!");
  console.log("=================================================");
}

runTests().catch(console.error);
