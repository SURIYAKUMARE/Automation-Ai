"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Asset {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  duration_seconds: number | null;
  collection_name: string | null;
  previewUrl: string | null;
}

export default function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [type, setType] = useState("");
  const [query, setQuery] = useState({ q: "", collection: "" });
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [size, setSize] = useState(24);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ ...query, type, page: String(page) });
    fetch("/api/media/list?" + params, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load your media library.");
      const result = await response.json();
      setAssets(result.media);
      setTotal(result.total);
      setSize(result.size);
      setError("");
      if (page > 0 && page * result.size >= result.total) setPage(page - 1);
    }).catch((reason) => {
      if (!controller.signal.aborted) setError(reason.message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [page, type, query, refresh]);

  async function upload(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        try {
          const response = await fetch("/api/media/upload", { method: "POST", body: form });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Upload failed");
          toast.success(file.name + " is in your library");
        } catch (reason) {
          toast.error(file.name + " — " + (reason instanceof Error ? reason.message : "Upload failed"));
        }
      }
    } finally {
      setPage(0);
      setRefresh((value) => value + 1);
      setUploading(false);
    }
  }

  async function update(asset: Asset, collection?: string) {
    const removing = collection === undefined;
    if (removing && !window.confirm("Delete “" + asset.file_name + "” from your library?")) return;
    setBusy(asset.id);
    try {
      const response = await fetch(removing ? "/api/media/delete" : "/api/media/" + asset.id, {
        method: removing ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(removing ? { mediaId: asset.id } : { collection }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update media");
      toast.success(removing ? "Media deleted" : "Collection updated");
      setEditing("");
      setRefresh((value) => value + 1);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Could not update media");
    } finally {
      setBusy("");
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Media library</h1><p className="mt-1 text-sm text-muted-foreground">Find and reuse photos and videos in your posts.</p></div>
      <label className={"inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground " + (uploading ? "opacity-60" : "")}>
        <Upload size={16} /> {uploading ? "Uploading…" : "Upload media"}
        <input aria-label="Upload media" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple disabled={uploading} onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void upload(files);
        }} />
      </label>
    </div>
    <form className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]" onSubmit={(event) => {
      event.preventDefault();
      const fields = new FormData(event.currentTarget);
      setLoading(true);
      setPage(0);
      setQuery({ q: String(fields.get("q") || "").trim(), collection: String(fields.get("collection") || "").trim() });
    }}>
      <Input name="q" aria-label="File name" placeholder="Find a file…" maxLength={100} />
      <Input name="collection" aria-label="Collection filter" placeholder="Collection name" maxLength={60} />
      <select aria-label="Media type" className="rounded-md border bg-background px-3 py-2 text-sm" value={type} onChange={(event) => {
        setLoading(true);
        setPage(0);
        setType(event.target.value);
      }}>
        <option value="">All media</option><option value="image">Photos</option><option value="video">Videos</option>
      </select>
      <Button variant="outline" type="submit">Search</Button>
    </form>
    {loading ? <p role="status" className="text-sm text-muted-foreground">Loading media…</p> :
      error ? <div role="alert" className="space-y-2"><p>{error}</p><Button size="sm" variant="outline" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Retry</Button></div> :
      !assets.length ? <p className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">No media matches this view.</p> :
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{assets.map((asset) => {
        const video = asset.mime_type.startsWith("video/");
        return <li key={asset.id} className="min-w-0 overflow-hidden rounded-xl border bg-card">
          <div className="relative grid aspect-video place-items-center bg-muted">
            {asset.previewUrl && <img src={asset.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
            {video ? <Film className="relative size-6 text-white drop-shadow" aria-label="Video" /> : !asset.previewUrl && <ImageIcon className="size-6 text-muted-foreground" aria-hidden />}
          </div>
          <div className="space-y-3 p-4">
            <div><p title={asset.file_name} className="truncate text-sm font-medium">{asset.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {asset.file_size < 1024 * 1024 ? Math.ceil(asset.file_size / 1024) + " KB" : (asset.file_size / (1024 * 1024)).toFixed(1) + " MB"}
                {asset.duration_seconds != null && " · " + Math.round(asset.duration_seconds) + " s"}
              </p>
              {asset.collection_name && <p className="truncate text-xs text-muted-foreground">{asset.collection_name}</p>}</div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <Link className="font-semibold underline underline-offset-2" href={"/dashboard/create-post?media=" + asset.id}>Use in post</Link>
              <button type="button" className="hover:underline" onClick={() => setEditing(editing === asset.id ? "" : asset.id)}>Collection</button>
              <button type="button" className="text-muted-foreground hover:text-destructive" disabled={Boolean(busy)} onClick={() => void update(asset)}>Delete</button>
            </div>
            {editing === asset.id && <form className="flex gap-2" onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              void update(asset, String(fields.get("name") || ""));
            }}>
              <Input name="name" maxLength={60} defaultValue={asset.collection_name ?? ""} placeholder="Collection name" aria-label={"Collection for " + asset.file_name} />
              <Button size="sm" type="submit" disabled={Boolean(busy)}>Save</Button>
            </form>}
          </div>
        </li>;
      })}</ul>}
    {!loading && !error && total > size && <nav aria-label="Media pages" className="flex items-center gap-3 text-sm">
      <Button variant="outline" size="sm" disabled={page === 0} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</Button>
      <span>Page {page + 1} of {Math.ceil(total / size)}</span>
      <Button variant="outline" size="sm" disabled={(page + 1) * size >= total} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</Button>
    </nav>}
  </div>;
}
