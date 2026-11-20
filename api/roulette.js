export default async function handler(req, res) {
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

  try {
    let response = await fetch(url, { headers });
    
    // Step 2: Handle gd_dt challenge
    const setCookie = response.headers.get("set-cookie") || "";
    const match = setCookie.match(/gd_dt=([^;]+)/);
    if (match) {
      headers["Cookie"] = `gd_dt=${match[1]}; ${baseCookie}`;
      response = await fetch(url, { headers });
    }

    const data = await response.text();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
