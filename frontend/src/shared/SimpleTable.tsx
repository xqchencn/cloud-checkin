import type { ReactNode } from 'react'

export function SimpleTable({ headers, rows, mobile = 'generic', columnClassNames = [] }: {
  headers: string[]
  rows: ReactNode[][]
  mobile?: 'generic' | 'none'
  columnClassNames?: string[]
}) {
  if (!rows.length) {
    return <div className="soft-card px-4 py-8 text-center text-sm text-slate-500">暂无数据</div>
  }
  return (
    <div>
      {mobile === 'generic' ? (
        <div className="grid min-w-0 gap-3 lg:hidden">
          {rows.map((row, rowIndex) => (
            <article key={rowIndex} className="soft-card min-w-0 p-4">
              <dl className="grid gap-3">
                {headers.map((header, cellIndex) => (
                  <div key={header} className="min-w-0">
                    <dt className="text-xs font-medium text-slate-500">{header}</dt>
                    <dd className="mt-1 min-w-0 text-sm text-slate-800">{renderLogCell(row[cellIndex])}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      ) : null}
      <div className="hidden rounded-lg border border-line bg-white lg:block">
        <table className="w-full table-fixed divide-y divide-line text-sm">
          <thead className="bg-slate-50/80 text-left text-xs text-slate-500">
            <tr>{headers.map((header, index) => <th key={header} className={`px-2 py-2 font-semibold ${columnClassNames[index] || ''}`}>{header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-3 align-top leading-5 text-slate-700">{renderLogCell(cell)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function renderLogCell(cell: ReactNode): ReactNode {
  if (cell == null || cell === '') return <span>-</span>
  if (typeof cell === 'string' || typeof cell === 'number') {
    return <span className="block max-w-full truncate" title={String(cell)}>{cell}</span>
  }
  return cell
}
