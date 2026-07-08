const GALLERY_WIDTH = 1500;
const GALLERY_HEIGHT = 900;
const JPEG_QUALITY = 82;

export async function processGalleryImage(buffer: Buffer): Promise<Buffer> {
  const { default: sharp } = await import("sharp");
  return sharp(buffer)
    .rotate()
    .resize(GALLERY_WIDTH, GALLERY_HEIGHT, { fit: "cover", position: "centre" })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
