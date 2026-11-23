import html2canvas from 'html2canvas-pro';

export interface CaptureResult {
  blob: Blob;
  file: File;
  dataUrl: string;
}

/**
 * Safely captures a DOM node to high-res JPEG, fully compatible with Tailwind CSS v4 OKLCH colors,
 * ensuring the entire receipt from top to bottom (including QR code and disclaimer) is captured
 * without being clipped by parent scroll containers or viewports.
 */
export async function captureNodeToJpeg(
  node: HTMLElement,
  fileName: string = 'bill.jpg',
  quality: number = 0.95
): Promise<CaptureResult> {
  const fullHeight = Math.max(node.scrollHeight, node.offsetHeight, 400);
  const fullWidth = Math.max(node.scrollWidth, node.offsetWidth, 280);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    height: fullHeight,
    width: fullWidth,
    windowHeight: fullHeight + 300,
    scrollY: 0,
    scrollX: 0,
    onclone: (clonedDoc, clonedElement) => {
      // Remove any height caps or overflow restrictions in cloned document
      clonedElement.style.height = 'auto';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.overflow = 'visible';
      let parent = clonedElement.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.height = 'auto';
        parent.style.maxHeight = 'none';
        parent.style.overflow = 'visible';
        parent = parent.parentElement;
      }
    },
  });

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      quality
    );
  });

  const file = new File([blob], fileName, { type: 'image/jpeg' });
  return { blob, file, dataUrl };
}

/**
 * Safely captures a DOM node to high-res PNG (ideal for PDF embedding and Clipboard copy),
 * guaranteeing complete full-height rendering.
 */
export async function captureNodeToPng(
  node: HTMLElement,
  fileName: string = 'bill.png'
): Promise<CaptureResult> {
  const fullHeight = Math.max(node.scrollHeight, node.offsetHeight, 400);
  const fullWidth = Math.max(node.scrollWidth, node.offsetWidth, 280);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    height: fullHeight,
    width: fullWidth,
    windowHeight: fullHeight + 300,
    scrollY: 0,
    scrollX: 0,
    onclone: (clonedDoc, clonedElement) => {
      clonedElement.style.height = 'auto';
      clonedElement.style.maxHeight = 'none';
      clonedElement.style.overflow = 'visible';
      let parent = clonedElement.parentElement;
      while (parent && parent !== clonedDoc.body) {
        parent.style.height = 'auto';
        parent.style.maxHeight = 'none';
        parent.style.overflow = 'visible';
        parent = parent.parentElement;
      }
    },
  });

  const dataUrl = canvas.toDataURL('image/png');
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });

  const file = new File([blob], fileName, { type: 'image/png' });
  return { blob, file, dataUrl };
}

/**
 * Safely copies a rendered image blob to the user's system clipboard.
 */
export async function copyNodeImageToClipboard(node: HTMLElement): Promise<boolean> {
  try {
    const pngResult = await captureNodeToPng(node);
    if (pngResult.blob && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngResult.blob }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard write failed or not supported:', err);
  }
  return false;
}
