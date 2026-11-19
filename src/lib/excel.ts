import type { Orcamento } from './types';
import { dataBR } from './format';

/** Gera a planilha formatada (mesmo formato do programa de computador, com a coluna Situação). */
export async function gerarPlanilha(lista: Orcamento[], empresa: string, periodo: string): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Orçamentos', { views: [{ state: 'frozen', ySplit: 4 }] });
  const cols = [
    { h: 'Nº', w: 7 }, { h: 'Entrada', w: 12 }, { h: 'Saída', w: 12 }, { h: 'Cliente', w: 28 },
    { h: 'Telefone', w: 16 }, { h: 'Veículo', w: 26 }, { h: 'Placa', w: 11 }, { h: 'Serviços', w: 42 },
    { h: 'Peças (R$)', w: 13 }, { h: 'Total (R$)', w: 14 }, { h: 'Situação', w: 14 },
  ];
  ws.columns = cols.map((c) => ({ width: c.w }));
  ws.mergeCells(1, 1, 1, cols.length);
  const t = ws.getCell(1, 1);
  t.value = empresa; t.font = { name: 'Georgia', size: 16, bold: true, color: { argb: 'FFB3241F' } };
  ws.mergeCells(2, 1, 2, cols.length);
  ws.getCell(2, 1).value = `Relatório de orçamentos — ${periodo}`;
  ws.getCell(2, 1).font = { size: 11, color: { argb: 'FF6B6459' } };

  const cab = ws.getRow(4);
  cols.forEach((c, i) => {
    const cel = cab.getCell(i + 1);
    cel.value = c.h;
    cel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1917' } };
    cel.alignment = { vertical: 'middle', horizontal: i >= 8 && i <= 9 ? 'right' : 'left' };
  });
  cab.height = 22;

  const borda = { style: 'thin' as const, color: { argb: 'FFE2DAC7' } };
  lista.forEach((o, i) => {
    const v = o.veiculo;
    const r = ws.addRow([
      o.numero, dataBR(o.entrada), dataBR(o.saida), o.cliente.nome, o.cliente.telefone ?? '',
      [v.marca, v.modelo, v.ano].filter(Boolean).join(' '), v.placa,
      o.servicos.map((s) => s.nome).join(', '), o.pecas, o.total, o.status,
    ]);
    r.eachCell((c) => {
      c.border = { top: borda, bottom: borda, left: borda, right: borda };
      c.alignment = { vertical: 'middle', wrapText: true };
      if (i % 2) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF7F0' } };
    });
    r.getCell(9).numFmt = '"R$" #,##0.00'; r.getCell(10).numFmt = '"R$" #,##0.00';
  });

  const fim = ws.addRow(['', '', '', '', '', '', '', 'TOTAL', lista.reduce((s, o) => s + o.pecas, 0), lista.reduce((s, o) => s + o.total, 0), '']);
  fim.font = { bold: true };
  fim.getCell(9).numFmt = '"R$" #,##0.00'; fim.getCell(10).numFmt = '"R$" #,##0.00';
  fim.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6E3B4' } }; });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
