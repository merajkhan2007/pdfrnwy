import pymupdf
import os

def compress_test():
    input_path = "scratch/sample.pdf"
    output_path = "scratch/sample_compressed.pdf"
    
    if not os.path.exists(input_path):
        print(f"Error: {input_path} does not exist!")
        return

    print(f"Opening {input_path}...")
    doc = pymupdf.open(input_path)
    
    image_quality = 65
    max_dpi = 72
    remove_metadata = False
    
    print(f"Total pages: {len(doc)}")
    
    # Process each page to compress images
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Get all images on the page
        image_list = page.get_images(full=True)
        print(f"Page {page_num} image list: {image_list}")
        
        for img_info in image_list:
            xref = img_info[0]
            print(f"Processing image xref: {xref}")
            
            try:
                # Extract image
                base_image = doc.extract_image(xref)
                if not base_image:
                    print(f"  Could not extract image for xref {xref}")
                    continue
                
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                width = base_image.get("width", 0)
                height = base_image.get("height", 0)
                
                print(f"  Extracted image info: ext={image_ext}, size={len(image_bytes)}, width={width}, height={height}")
                
                # Skip small images (likely icons)
                if width < 50 or height < 50:
                    print("  Skipping small image (width/height < 50)")
                    continue
                
                # Calculate current DPI (approximate)
                # Skip if already low quality
                if len(image_bytes) < 10000:
                    print("  Skipping small file size image (< 10000 bytes)")
                    continue
                
                # Create pixmap directly from PDF and xref to avoid format parsing errors
                pix = pymupdf.Pixmap(doc, xref)
                print(f"  Pixmap created successfully: width={pix.width}, height={pix.height}, colorspace={pix.colorspace.name if pix.colorspace else 'None'}, alpha={pix.alpha}")
                
                # Check if we need to reduce quality
                if pix.width > 100 and pix.height > 100:
                    scale = 1.0
                    if pix.width > max_dpi * 10 or pix.height > max_dpi * 10:
                        scale = max(max_dpi * 10 / pix.width, max_dpi * 10 / pix.height)
                        if scale < 1.0:
                            new_width = int(pix.width * scale)
                            new_height = int(pix.height * scale)
                            print(f"  Scaling image from {pix.width}x{pix.height} to {new_width}x{new_height}")
                            if new_width > 50 and new_height > 50:
                                # Create new smaller pixmap by sampling
                                pix2 = pymupdf.Pixmap(pix, new_width, new_height, None)
                                pix = pix2
                    
                    # Convert to RGB if needed (JPEG doesn't support alpha, and we force DeviceRGB)
                    if not pix.colorspace or pix.colorspace.name != "DeviceRGB" or pix.alpha:
                        print("  Converting to RGB...")
                        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                    
                    print("  Converting Pixmap to JPEG bytes...")
                    new_image_bytes = pix.tobytes(output="jpeg", jpg_quality=image_quality)
                    print(f"  New image bytes size: {len(new_image_bytes)} vs original {len(image_bytes)}")
                    
                    # Only replace if we actually reduced size
                    if len(new_image_bytes) < len(image_bytes) * 0.9:
                        print("  Updating image stream in PDF...")
                        doc.update_stream(xref, new_image_bytes)
                        doc.xref_set_key(xref, "Filter", "/DCTDecode")
                        doc.xref_set_key(xref, "ColorSpace", "/DeviceRGB")
                        doc.xref_set_key(xref, "BitsPerComponent", "8")
                        doc.xref_set_key(xref, "Width", str(pix.width))
                        doc.xref_set_key(xref, "Height", str(pix.height))
                        try:
                            doc.xref_set_key(xref, "DecodeParms", "null")
                            print("  Removed DecodeParms")
                        except Exception as de:
                            print(f"  Failed to remove DecodeParms: {de}")
                    else:
                        print("  New image bytes size was not significantly smaller, skipping update")
            except Exception as e:
                print(f"  Error processing image xref {xref}: {e}")
                import traceback
                traceback.print_exc()

    # Save with maximum compression
    print("Saving compressed document...")
    pdf_bytes = doc.tobytes(
        garbage=4,  # Remove unused objects, merge duplicate objects
        deflate=True,  # Compress streams
    )
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)
    doc.close()
    print(f"Compressed file saved to {output_path}, original size={os.path.getsize(input_path)}, compressed size={os.path.getsize(output_path)}")

if __name__ == "__main__":
    compress_test()
