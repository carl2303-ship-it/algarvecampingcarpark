"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GalleryImageRecord } from "@/types/database";

export function GalleryManager({ initialImages }: { initialImages: GalleryImageRecord[] }) {
  const [images, setImages] = useState(
    [...initialImages].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title_pt: "", title_en: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [titlePt, setTitlePt] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/admin/gallery");
    const data = await res.json();
    setImages((data.images ?? []).sort((a: GalleryImageRecord, b: GalleryImageRecord) => a.sort_order - b.sort_order));
  }

  async function persistOrder(next: GalleryImageRecord[]) {
    setSaving(true);
    const items = next.map((img, i) => ({ id: img.id, sort_order: i + 1 }));
    await fetch("/api/admin/gallery/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setImages(next.map((img, i) => ({ ...img, sort_order: i + 1 })));
    setSaving(false);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  function startEdit(image: GalleryImageRecord) {
    setEditingId(image.id);
    setEditForm({
      title_pt: image.title_pt,
      title_en: image.title_en ?? "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/admin/gallery/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title_pt: editForm.title_pt,
        title_en: editForm.title_en || null,
      }),
    });
    setEditingId(null);
    setSaving(false);
    refresh();
  }

  async function toggleActive(image: GalleryImageRecord) {
    setSaving(true);
    await fetch(`/api/admin/gallery/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !image.active }),
    });
    setSaving(false);
    refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta foto da galeria?")) return;
    setSaving(true);
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    setSaving(false);
    refresh();
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !titlePt.trim()) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title_pt", titlePt.trim());
    if (titleEn.trim()) formData.append("title_en", titleEn.trim());

    const res = await fetch("/api/admin/gallery/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      setTitlePt("");
      setTitleEn("");
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } else {
      const data = await res.json();
      alert(data.error ?? "Erro ao carregar imagem");
    }
    setUploading(false);
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar foto</CardTitle>
          <CardDescription>
            A imagem é redimensionada automaticamente para 5:3 (1500×900). Aparece na página Sobre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Imagem</Label>
              <Input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" required />
            </div>
            <div className="space-y-2">
              <Label>Título PT</Label>
              <Input value={titlePt} onChange={(e) => setTitlePt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Título EN</Label>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ImagePlus className="h-4 w-4 mr-2" />
                )}
                Carregar foto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos da galeria ({images.length})</CardTitle>
          <CardDescription>Altere títulos, ordem e visibilidade. A ordem reflecte-se no carrossel público.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {images.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma foto na galeria.</p>
          )}
          {images.map((image, index) => (
            <div
              key={image.id}
              className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card"
            >
              <div className="relative w-full sm:w-40 aspect-[5/3] shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={image.src} alt={image.title_pt} fill className="object-cover" sizes="160px" unoptimized={image.src.startsWith("http")} />
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                {editingId === image.id ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Título PT</Label>
                      <Input
                        value={editForm.title_pt}
                        onChange={(e) => setEditForm((f) => ({ ...f, title_pt: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Título EN</Label>
                      <Input
                        value={editForm.title_en}
                        onChange={(e) => setEditForm((f) => ({ ...f, title_en: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-2">
                      <Button type="button" size="sm" onClick={() => saveEdit(image.id)} disabled={saving}>
                        <Check className="h-4 w-4 mr-1" /> Guardar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{image.title_pt}</p>
                      {!image.active && <Badge variant="secondary">Oculta</Badge>}
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    {image.title_en && (
                      <p className="text-sm text-muted-foreground">{image.title_en}</p>
                    )}
                  </>
                )}

                <div className="flex flex-wrap gap-1">
                  <Button type="button" size="icon" variant="outline" disabled={index === 0 || saving} onClick={() => move(index, -1)} aria-label="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" disabled={index === images.length - 1 || saving} onClick={() => move(index, 1)} aria-label="Descer">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => startEdit(image)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => toggleActive(image)} disabled={saving}>
                    {image.active ? "Ocultar" : "Publicar"}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(image.id)} disabled={saving}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
