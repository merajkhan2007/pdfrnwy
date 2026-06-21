import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function run() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  
  // Draw some text
  page.drawText('This is a sample PDF for compression testing with a large image.', {
    x: 50,
    y: 750,
    size: 16,
    color: rgb(0, 0, 0),
  });
  
  // Load the generated image using forward slashes
  const imagePath = "C:/Users/HP/.gemini/antigravity-ide/brain/395746cb-46bd-4280-bcde-b26af5d51a5a/test_image_1781461941953.png";
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at ${imagePath}`);
  }
  
  const imageBytes = fs.readFileSync(imagePath);
  
  let pngImage;
  try {
    pngImage = await pdfDoc.embedPng(imageBytes);
    console.log("Embedded image as PNG");
  } catch (e) {
    console.log("Failed to embed as PNG, trying JPG...", e.message);
    pngImage = await pdfDoc.embedJpg(imageBytes);
    console.log("Embedded image as JPG");
  }
  
  page.drawImage(pngImage, {
    x: 50,
    y: 100,
    width: 500,
    height: 500,
  });

  const pdfBytes = await pdfDoc.save();
  const outputPath = path.join(process.cwd(), 'scratch', 'sample.pdf');
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Saved sample PDF to ${outputPath}, size = ${pdfBytes.length} bytes`);
}

run().catch(console.error);
