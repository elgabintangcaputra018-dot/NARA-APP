const http = require("http");

function checkRoute(path, cookie = null) {
  return new Promise((resolve) => {
    const headers = {};
    if (cookie) headers["Cookie"] = cookie;
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method: "GET",
        headers,
      },
      (res) => {
        resolve({
          status: res.statusCode,
          location: res.headers["location"],
        });
      }
    );
    req.end();
  });
}

async function test() {
  console.log("Testing middleware & routes:");
  const noAuth = await checkRoute("/dashboard");
  console.log("GET /dashboard (no cookie):", noAuth.status, "-> Location:", noAuth.location);

  const loginRedirect = await checkRoute("/login");
  console.log("GET /login:", loginRedirect.status, "-> Location:", loginRedirect.location);

  const activatePage = await checkRoute("/activate");
  console.log("GET /activate (no cookie):", activatePage.status);
}

test();
