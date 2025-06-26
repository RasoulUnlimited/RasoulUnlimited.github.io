export default {
    async fetch(request, env, ctx) {
      const ua = request.headers.get("User-Agent") || "";
      const crawlerPattern = /googlebot|bingbot|twitterbot|facebook|linkedin/i;
      const isCrawler = crawlerPattern.test(ua);
  
      const response = await fetch(request);
  
      if (!isCrawler) {
        return response;
      }
  
      const contentType = response.headers.get("content-type") || "";
      if (isCrawler && contentType.includes("text/html")) {
        const headers = new Headers(response.headers);
        headers.set("X-Crawler-Handled", "true");
        const cacheControl =
          response.headers.get("cache-control") || "public, max-age=600";
        headers.set("cache-control", cacheControl);
        const schemaURL = new URL("/schema/identity.jsonld", request.url).toString();
        const schemaRes = await fetch(schemaURL);
        const payloadText = await schemaRes.text();
        const crawlerScript = `<script nonce="RasoulCSP" type="application/ld+json">${payloadText}</script>`;
        const html = (await response.text()).replace("</head>", `${crawlerScript}</head>`);
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
  
      return response;
    },
  };
  