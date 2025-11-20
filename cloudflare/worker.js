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
      const schemaURL = new URL(
        "/schema/identity.jsonld",
        request.url
      ).toString();

      try {
        const schemaRes = await fetch(schemaURL);

        // Validate the schema response
        if (!schemaRes.ok) {
          console.error(`Failed to fetch schema: ${schemaRes.status}`);
          // Return original response if schema fetch fails
          return response;
        }

        // Validate content type
        const schemaContentType = schemaRes.headers.get("content-type") || "";
        if (!schemaContentType.includes("application/json") &&
            !schemaContentType.includes("application/ld+json")) {
          console.error(`Invalid schema content-type: ${schemaContentType}`);
          return response;
        }

        const payloadText = await schemaRes.text();

        // Validate JSON structure before injecting
        try {
          JSON.parse(payloadText);
        } catch (jsonErr) {
          console.error("Invalid JSON in schema:", jsonErr);
          return response;
        }

        // Escape HTML special characters to prevent XSS
        const escapedPayload = payloadText
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
        const crawlerScript = `<script nonce="RasoulCSP" type="application/ld+json">${escapedPayload}</script>`;
        const html = (await response.text()).replace(
          "</head>",
          `${crawlerScript}</head>`
        );
        headers.set("Cache-Control", "public, max-age=600");
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (err) {
        // Log error and return original response if anything fails
        console.error("Error processing crawler request:", err);
        return response;
      }
    }

    return response;
  },
};
