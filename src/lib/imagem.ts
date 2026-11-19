/** Reduz a foto do celular/tablet antes de enviar (economiza espaço, como no programa de computador). */
async function carregar(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* cai para o método antigo */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((ok, erro) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => erro(new Error('Não foi possível ler a imagem.'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

async function redimensionar(file: Blob, maxLado: number, tipo: string, qualidade?: number, fundoBranco = false) {
  const img = await carregar(file);
  const w = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const h = 'naturalHeight' in img ? img.naturalHeight : img.height;
  const esc = Math.min(1, maxLado / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * esc));
  canvas.height = Math.max(1, Math.round(h * esc));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Seu navegador não conseguiu processar a imagem.');
  if (fundoBranco) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error('Falha ao gerar a imagem.'))), tipo, qualidade),
  );
}

/** Foto de veículo: lado maior 1280 px, JPEG qualidade 80%. */
export const comprimirFoto = (file: Blob) => redimensionar(file, 1280, 'image/jpeg', 0.8, true);

/** Logo e imagem de fundo do recibo: PNG de até 900 px. */
export const prepararImagemEmpresa = (file: Blob) => redimensionar(file, 900, 'image/png');

export function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(r.result as string);
    r.onerror = () => erro(new Error('Falha ao ler o arquivo.'));
    r.readAsDataURL(blob);
  });
}
