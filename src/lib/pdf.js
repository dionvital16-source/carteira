/* Browser side of the nota reader: loads pdf.js (and its worker) on demand so
   the main bundle stays free of it, then hands the text to lerNota. */

import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

import { lerNota, textoDoPdf } from './nota.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Reads one File (a nota PDF) into the nota shape; throws when pdf.js cannot open it. */
export async function lerNotaDoArquivo(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const texto = await textoDoPdf(pdfjs, bytes);
  return lerNota(texto, file.name);
}
