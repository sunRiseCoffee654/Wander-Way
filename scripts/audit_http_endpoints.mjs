import http from "node:http";

const tests = [
  { name: "Home Launcher (/)", path: "/", expect: ["Travel Dates", "Plan Trip", "Destination", "₹75,000"] },
  { name: "Explore Hub (/explore)", path: "/explore", expect: ["Live Consular Feed", "Kyoto, Japan", "Swiss Alps", "Amalfi Coast", "Oaxaca"] },
  { name: "Trips Overview (/trips)", path: "/trips", expect: ["Saved Itineraries", "Plan New Trip"] },
  { name: "Budget Intelligence (/budget)", path: "/budget", expect: ["Budget Intelligence", "INR", "₹"] },
  { name: "Smart Packing (/packing)", path: "/packing", expect: ["Smart Packing", "Gear"] },
  { name: "Document Vault (/vault)", path: "/vault", expect: ["Travel Vault", "Secure Travel Vault"] },
  { name: "404 Not Found (/nonexistent-trip-id)", path: "/nonexistent-trip-id", expectStatus: 404, expect: ["Destination Not Found"] },
  { name: "Profile Settings (/profile)", path: "/profile", expect: ["INR (₹) • Indian Rupee", "Elena Rostova", "Travel Preferences"] },
  { name: "Auth Login (/login)", path: "/login", expect: ["Sign in", "Login"] },
  { name: "Auth Verify (/verify)", path: "/verify", expectStatus: 200 },
  { name: "Auth Entry Point Redirect (/auth/login)", path: "/auth/login", expectStatus: 307, expectLocation: "/login" },
  { name: "Auth Entry Point Redirect (/auth/sign-up)", path: "/auth/sign-up", expectStatus: 307, expectLocation: "/login" },
  { name: "Trip Creation Redirect (/trips/new)", path: "/trips/new?dest=Kyoto&budget=75000", expectStatus: 307, expectLocation: "/login?next=%2Ftrips%2Fnew%3Fdest%3DKyoto%26budget%3D75000" },
  { name: "API Advisories (/api/advisories)", path: "/api/advisories?country=JP", expect: ["success", "level"] },
  { name: "API Currency Rates (/api/currency/rates)", path: "/api/currency/rates?base=INR", expect: ["INR", "rates"] },
  { name: "API Weather (/api/weather)", path: "/api/weather?lat=35.0116&lon=135.7681", expect: ["success", "temperature"] },
];

async function run() {
  let passed = 0;
  for (const t of tests) {
    await new Promise((resolve) => {
      http.get("http://localhost:3000" + t.path, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          let ok = true;
          if (t.expectStatus && res.statusCode !== t.expectStatus) {
            console.error(`FAIL ${t.name}: expected status ${t.expectStatus} got ${res.statusCode}`);
            ok = false;
          }
          if (t.expectLocation && res.headers.location !== t.expectLocation) {
            console.error(`FAIL ${t.name}: expected location ${t.expectLocation} got ${res.headers.location}`);
            ok = false;
          }
          if (t.expect) {
            for (const str of t.expect) {
              if (!body.includes(str)) {
                console.error(`FAIL ${t.name}: missing expected string "${str}" in response body (length ${body.length})`);
                ok = false;
              }
            }
          }
          if (ok) {
            console.log(`PASS ${t.name} [status ${res.statusCode}, ${body.length} bytes]`);
            passed++;
          }
          resolve();
        });
      }).on("error", (err) => {
        console.error(`ERROR ${t.name}: ${err.message}`);
        resolve();
      });
    });
  }
  console.log(`\nFINAL AUDIT RESULT: ${passed}/${tests.length} checks PASSED`);
}

run();
