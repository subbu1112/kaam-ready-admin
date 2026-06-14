export default function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 18,
        padding: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,.05), 0 4px 14px rgba(0,0,0,.04)',
        border: '1px solid #F0F0F2',
        ...style,
      }}>
      {children}
    </div>
  )
}
