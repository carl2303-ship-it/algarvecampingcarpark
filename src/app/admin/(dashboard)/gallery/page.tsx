import { GalleryManager } from "@/components/admin/gallery-manager";
import { adminT } from "@/lib/admin-i18n";
import { getGalleryImagesAdmin } from "@/lib/gallery";

export default async function GalleryAdminPage() {
  const images = await getGalleryImagesAdmin();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{adminT.gallery.pageTitle}</h1>
        <p className="text-muted-foreground mt-1">{adminT.gallery.pageDescription}</p>
      </div>
      <GalleryManager initialImages={images} />
    </div>
  );
}
