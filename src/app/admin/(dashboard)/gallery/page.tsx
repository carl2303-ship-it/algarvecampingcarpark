import { GalleryManager } from "@/components/admin/gallery-manager";
import { getGalleryImagesAdmin } from "@/lib/gallery";

export default async function GalleryAdminPage() {
  const images = await getGalleryImagesAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Galeria</h1>
        <p className="text-muted-foreground mt-1">
          Gerir fotos do carrossel na página Sobre — adicionar, remover, ordenar e editar títulos.
        </p>
      </div>
      <GalleryManager initialImages={images} />
    </div>
  );
}
