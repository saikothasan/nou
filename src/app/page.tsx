"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Share2, Globe, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { deployUserWorker } from "@/app/actions/deploy";

// Dynamically import Monaco Editor with SSR disabled to fix "navigator is not defined"
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DEFAULT_CODE = `export default {
  async fetch(request, env, ctx) {
    return new Response(
      \`
      <!DOCTYPE html>
      <div style="font-family: system-ui; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #09090b; color: white;">
        <h1 style="font-size: 3rem; font-weight: 800; margin-bottom: 1rem; background: linear-gradient(to right, #ec4899, #8b5cf6); -webkit-background-clip: text; color: transparent;">
          Hello from Cloudflare!
        </h1>
        <p style="color: #a1a1aa; font-size: 1.25rem;">
          Deployed instantly via Workers for Platforms
        </p>
        <div style="margin-top: 2rem; padding: 1rem 2rem; border: 1px solid #27272a; border-radius: 8px; background: #18181b;">
          Request URL: \${request.url}
        </div>
      </div>
      \`,
      { headers: { "content-type": "text/html" } }
    );
  },
};`;

export default function EditorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [isDeploying, setIsDeploying] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const handleDeploy = async () => {
    setIsDeploying(true);
    const toastId = toast.loading("Deploying to the edge...");

    try {
      const result = await deployUserWorker(code);
      
      if (!result.success) throw new Error(result.error);

      setPreviewUrl(result.url);
      setIframeKey(prev => prev + 1);
      
      toast.success("Deployed successfully!", { 
        id: toastId,
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> 
      });
    } catch (err: any) {
      toast.error("Deployment failed: " + err.message, { id: toastId });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="h-screen w-full bg-zinc-950 text-zinc-50 flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Worker<span className="text-zinc-400">Playground</span></span>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
          <Button 
            onClick={handleDeploy} 
            disabled={isDeploying}
            className="bg-white text-black hover:bg-zinc-200 transition-all font-medium"
          >
            {isDeploying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4 fill-current" />
            )}
            {isDeploying ? "Deploying..." : "Run"}
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          
          {/* Editor Pane */}
          <ResizablePanel defaultSize={50} minSize={30} className="bg-[#1e1e1e] flex flex-col">
             <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  automaticLayout: true,
                }}
              />
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800 hover:bg-orange-500 transition-colors" />

          {/* Preview Pane */}
          <ResizablePanel defaultSize={50} minSize={30} className="bg-zinc-950 flex flex-col">
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2 text-xs text-zinc-400">
              <div className="h-2 w-2 rounded-full bg-red-500/20 border border-red-500/50" />
              <div className="h-2 w-2 rounded-full bg-amber-500/20 border border-amber-500/50" />
              <div className="h-2 w-2 rounded-full bg-green-500/20 border border-green-500/50" />
              <div className="ml-4 flex-1 bg-zinc-950 rounded border border-zinc-800 px-3 py-1 truncate font-mono">
                {previewUrl || "Waiting for deployment..."}
              </div>
            </div>
            
            <div className="flex-1 relative bg-white">
              {previewUrl ? (
                <iframe
                  key={iframeKey}
                  src={previewUrl}
                  className="absolute inset-0 w-full h-full border-none"
                  title="Worker Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
                    <Play className="h-8 w-8 text-zinc-300" />
                  </div>
                  <p>Click "Run" to build and deploy your worker</p>
                </div>
              )}
            </div>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
}
