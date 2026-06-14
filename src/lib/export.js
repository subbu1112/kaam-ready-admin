import * as XLSX from 'xlsx'

export function exportCSV(data, filename) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const csv = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click()
  URL.revokeObjectURL(url)
}

export function exportExcel(data, filename, sheetName = 'Sheet1') {
  if (!data.length) return
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename + '.xlsx')
}

export async function exportPDF(columns, rows, title, filename) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  doc.setFontSize(16)
  doc.text(title, 14, 15)
  doc.setFontSize(10)
  doc.text('Generated: ' + new Date().toLocaleString(), 14, 22)
  autoTable(doc, { head: [columns], body: rows, startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [99, 102, 241] } })
  doc.save(filename + '.pdf')
}
