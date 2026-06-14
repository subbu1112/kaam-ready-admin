export default function DataTable({
  columns,      // [{ key, label, width, render }]
  rows,
  loading,
  emptyMsg = 'No data found',
  onRowClick
}) {
  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'#475569' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>⏳</div>
      Loading...
    </div>
  )

  if (!rows?.length) return (
    <div style={{ padding:40, textAlign:'center', color:'#475569' }}>
      <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
      {emptyMsg}
    </div>
  )

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #1E293B' }}>
            {columns.map(c => (
              <th key={c.key} style={{
                textAlign:'left', padding:'10px 14px', color:'#64748B',
                fontWeight:600, fontSize:12, textTransform:'uppercase',
                letterSpacing:'.5px', whiteSpace:'nowrap',
                width: c.width || 'auto'
              }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom:'1px solid #1E293B',
                cursor: onRowClick ? 'pointer' : 'default',
                transition:'background .15s'
              }}
              onMouseEnter={e => { if (onRowClick) e.currentTarget.style.background = '#1E293B' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {columns.map(c => (
                <td key={c.key} style={{ padding:'12px 14px', color:'#CBD5E1', verticalAlign:'middle' }}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
