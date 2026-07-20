// Renders the first page of a PDF into a plain HTMLImageElement.
//
// NTA emails the scanned NEET OMR response sheet as a PDF (downloaded via
// the candidate login portal, or sent straight to the registered email) —
// not a photo anyone takes themselves. This lets the rest of the pipeline
// (omrImageScoring.js, omrManualAlign.js) keep working with a single
// HTMLImageElement input regardless of whether the person uploaded that
// PDF or a plain image.
//
// Loads pdfjs-dist lazily (dynamic import) since it's a real payload of
// its own — CSV-only and plain-image users should never download it.

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      // pdfjs needs its matching worker script; import.meta.url + Vite's
      // ?url handling gives it the right bundled path automatically.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/**
 * Renders page 1 of a PDF File/Blob to an HTMLImageElement at a decent
 * resolution for bubble detection (scale factor tuned for typical
 * letter/A4-ish scanned sheets — high enough that bubbles are several
 * pixels across, not so high it's slow to process).
 */
export async function pdfFileToImage(file, scale = 2.5) {
  const pdfjs = await loadPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;

  const dataUrl = canvas.toDataURL('image/png');
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('pdf_render_failed'));
    el.src = dataUrl;
  });
  return img;
}

export function isPdfFile(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
}
