"use server";

export async function deployUserWorker(scriptContent: string) {
  // Use environment variables for configuration
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const dispatchNamespace = "vibesdk"; // Must match wrangler.jsonc
  const scriptName = "playground-demo-" + Date.now(); // Unique name per deployment for this demo

  if (!accountId || !apiToken) {
    console.error("Missing Cloudflare Credentials");
    return { success: false, error: "Server configuration error: Missing credentials." };
  }

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/dispatch/namespaces/${dispatchNamespace}/scripts/${scriptName}`;

    // Cloudflare Workers API expects specific metadata and content
    const formData = new FormData();
    formData.append(
      "metadata",
      JSON.stringify({
        main_module: "worker.js",
        compatibility_date: "2024-09-23",
      })
    );
    
    // The user's code is uploaded as "worker.js"
    formData.append(
      "worker.js",
      new Blob([scriptContent], { type: "application/javascript+module" }),
      "worker.js"
    );

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: formData,
    });

    const data = await response.json() as any; // Cast to any to bypass TS check for now, or define a proper interface

    if (!response.ok) {
      console.error("Cloudflare API Error:", JSON.stringify(data, null, 2));
      const errorMsg = data.errors?.[0]?.message || "Failed to upload worker";
      throw new Error(errorMsg);
    }

    // Construct the URL. 
    // IMPORTANT: You must ensure this subdomain maps to your dispatch namespace in Cloudflare dashboard
    const subdomain = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN; 
    
    if (!subdomain) {
       return { success: false, error: "Subdomain configuration missing on server." };
    }

    const workerUrl = `https://${scriptName}.${dispatchNamespace}.${subdomain}.workers.dev`;

    return { success: true, url: workerUrl };

  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error occurred" };
  }
}
