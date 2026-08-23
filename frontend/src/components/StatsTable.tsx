import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

interface AlgoStat {
  algorithm: string;
  nodesVisited: number;
  pathLength: number;
  timeTaken: number;
}

export function StatsTable({ rows }: { rows: AlgoStat[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-[#2a2a2a]">
          <TableHead className="text-[#888] uppercase text-xs">Algorithm</TableHead>
          <TableHead className="text-[#888] uppercase text-xs">Nodes Visited</TableHead>
          <TableHead className="text-[#888] uppercase text-xs">Path Length</TableHead>
          <TableHead className="text-[#888] uppercase text-xs text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.algorithm} className="border-[#2a2a2a]">
            <TableCell className="text-white uppercase text-xs">{row.algorithm}</TableCell>
            <TableCell className="text-[#f5c518] text-xs">{row.nodesVisited}</TableCell>
            <TableCell className="text-[#f5c518] text-xs">{row.pathLength}</TableCell>
            <TableCell className="text-[#f5c518] text-xs text-right">{row.timeTaken}ms</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
