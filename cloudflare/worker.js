export default {
    async fetch(request, env, ctx) {
      const ua = request.headers.get("User-Agent") || "";
      const crawlerPattern = /googlebot|twitterbot|facebook/i;
      const isCrawler = crawlerPattern.test(ua);
  
      const response = await fetch(request);
  
      if (!isCrawler) {
        return response;
      }
  
      const headers = new Headers(response.headers);
      headers.set("X-Crawler-Handled", "true");
  
      if (headers.get("content-type")?.includes("text/html")) {
        const crawlerScript = `<script nonce="RasoulCSP" type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Mohammad Rasoul Sohrabi","url":"https://rasoulunlimited.ir"}</script>`;
        const html = (await response.text()).replace("</head>", `${crawlerScript}</head>`);
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }
  
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    },
  };