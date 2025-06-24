export default {
    async fetch(request, env, ctx) {
      const ua = request.headers.get("User-Agent") || "";
      const crawlerPattern = /googlebot|twitterbot|facebook/i;
      const isCrawler = crawlerPattern.test(ua);
  
      const response = await fetch(request);
  
      if (!isCrawler) {
        return response;
      }
  
      const contentType = response.headers.get("content-type") || "";
      if (isCrawler && contentType.includes("text/html")) {
        const headers = new Headers(response.headers);
        headers.set("X-Crawler-Handled", "true");
        const payload = {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Person",
              "name": "Mohammad Rasoul Sohrabi",
              "url": "https://rasoulunlimited.ir"
            },
            {
              "@type": "WebSite",
              "name": "Rasoul Unlimited",
              "url": "https://rasoulunlimited.ir"
            }
          ]
        };
        const crawlerScript = `<script nonce="RasoulCSP" type="application/ld+json">${JSON.stringify(payload)}</script>`;
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
  