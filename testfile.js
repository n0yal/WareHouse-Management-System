require('dotenv/config');

  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  if (!key) {
    console.log('Missing GEMINI_API_KEY in .env');
    process.exit(1);
  }

  (async () => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: 'Return ONLY one word: INFLAMMABLE, TOXIC, FRAGILE, NORMAL. Product: spray paint.' }] }
        ]
      })
    });

    const text = await res.text();
    console.log('HTTP', res.status);
    console.log(text);
  })();













