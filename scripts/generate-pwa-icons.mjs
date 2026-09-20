import sharp from "sharp";

const source = "public/logo1.png";

await sharp(source)
  .resize(192, 192)
  .png()
  .toFile("public/pwa-192x192.png");

await sharp(source)
  .resize(512, 512)
  .png()
  .toFile("public/pwa-512x512.png");

console.log("Created public/pwa-192x192.png");
console.log("Created public/pwa-512x512.png");