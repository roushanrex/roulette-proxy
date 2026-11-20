let ProxyAgent = null;
try {
  const undici = await import("undici");
  ProxyAgent = undici.ProxyAgent;
} catch (e) {
  // Safe fallback if undici is not bundled
}

async function fetchGameData(proxy = null) {
  const url = "https://gamedata365.com/games/catalog/latest?t=roulette";
  const now = Math.floor(Date.now() / 1000);

  const c1 = encodeURIComponent(JSON.stringify({ s: "google.com", l: "/", a: now, r: "google.com" }));
  const c2 = encodeURIComponent(JSON.stringify({ v: 1, p: 1, t: now }));
  const baseCookie = `gd_ft=${c1}; gd_tr=${c2}`;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": "https://gamedata365.com/games/roulette-tables",
    "Accept": "*/*",
    "Cookie": baseCookie
  };

  const fetchOpts = { headers };
  if (proxy && ProxyAgent) {
    fetchOpts.dispatcher = new ProxyAgent(`http://${proxy}`);
  }

  // Step 1: Initial challenge request
  let response = await fetch(url, fetchOpts);
  
  // Step 2: Handle gd_dt challenge
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/gd_dt=([^;]+)/);
  if (match) {
    headers["Cookie"] = `gd_dt=${match[1]}; ${baseCookie}`;
    response = await fetch(url, fetchOpts);
  }

  const text = await response.text();
  return { status: response.status, body: text };
}

export default async function handler(req, res) {
  try {
    // 1st Priority: Superfast direct Vercel cloud execution
    let result = await fetchGameData();

    // 2nd Priority (Safety Fallback): Agar kabhi 401 limit aaye, to HProxy se auto-fresh proxies uthao
    if (result.status !== 200) {
      try {
        const hpRes = await fetch("https://hproxy.com/api/proxy-list?protocol=https&format=txt&limit=8");
        const hpText = await hpRes.text();
        const proxies = hpText.split("\n").map(p => p.trim()).filter(p => p.length > 5);

        for (const proxy of proxies) {
          try {
            const pRes = await Promise.race([
              fetchGameData(proxy),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3500))
            ]);
            if (pRes && pRes.status === 200) {
              result = pRes;
              break;
            }
          } catch (err) {
            // Agli proxy try karega
          }
        }
      } catch (e) {
        // Fallback error ignored
      }
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(result.status).send(result.body);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
