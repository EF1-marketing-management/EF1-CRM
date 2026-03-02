'use client';

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import type { DealWithRelations } from '@/lib/types';
import { GripVertical, ChevronDown, ChevronRight, Archive } from 'lucide-react';

interface KanbanColumn {
  status: string;
  deals: DealWithRelations[];
}

interface KanbanBoardProps {
  pipelineColumns: KanbanColumn[];
  closedColumns: KanbanColumn[];
  onStatusChange: (dealId: string, newStatus: string) => void;
  onDealClick: (dealId: string) => void;
}

const columnColors: Record<string, string> = {
  'Nový': 'border-t-blue-400',
  'Jednáme': 'border-t-yellow-400',
  'Nabídka odeslaná': 'border-t-purple-400',
  'Realizace': 'border-t-cyan-400',
  'Deal': 'border-t-green-500',
  'Archiv': 'border-t-slate-400',
  'V řešení': 'border-t-yellow-400',
  'Nevyšlo': 'border-t-red-400',
  'Malý budget': 'border-t-orange-400',
  'Odmítnuto': 'border-t-red-300',
  'Odmítnuto klientem': 'border-t-red-300',
  'Bez reakce': 'border-t-gray-400',
  'Filip nedostupný': 'border-t-gray-400',
  'Předáno dál': 'border-t-indigo-400',
  'Nedohodli se': 'border-t-red-300',
  'Jiné': 'border-t-gray-300',
};

function DealCard({
  deal,
  onDragStart,
  onClick,
  isDragging,
}: {
  deal: DealWithRelations;
  onDragStart: () => void;
  onClick: () => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border border-border bg-card p-3 transition-all hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{deal.name}</p>
        <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-muted" />
      </div>
      {deal.client_name && (
        <p className="mt-1 text-xs text-muted">{deal.client_name}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {deal.inquiry_type && (
          <Badge variant="muted">{deal.inquiry_type}</Badge>
        )}
        {deal.assigned_to?.map((person) => (
          <span
            key={person}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-[10px] font-bold text-accent"
            title={person}
          >
            {person
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </span>
        ))}
      </div>
      {deal.value && (
        <p className="mt-2 text-xs font-semibold text-green-600">
          {deal.value.toLocaleString('cs-CZ')} Kč
        </p>
      )}
    </div>
  );
}

function Column({
  column,
  draggedDeal,
  dragOverColumn,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDealClick,
  compact,
}: {
  column: KanbanColumn;
  draggedDeal: string | null;
  dragOverColumn: string | null;
  onDragStart: (dealId: string) => void;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDragLeave: () => void;
  onDrop: (status: string) => void;
  onDealClick: (dealId: string) => void;
  compact?: boolean;
}) {
  const width = compact ? 'min-w-[220px]' : 'min-w-[280px]';

  return (
    <div
      className={`${width} flex-shrink-0 rounded-xl border border-border border-t-4 bg-background/50 ${
        columnColors[column.status] ?? 'border-t-gray-400'
      } ${
        dragOverColumn === column.status
          ? 'ring-2 ring-accent ring-offset-2'
          : ''
      }`}
      onDragOver={(e) => onDragOver(e, column.status)}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(column.status)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{column.status}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-border px-1.5 text-xs font-medium text-muted">
            {column.deals.length}
          </span>
        </div>
      </div>

      {/* Cards - scrollable */}
      <div className={`space-y-2 overflow-y-auto px-3 pb-3 ${compact ? 'max-h-[400px]' : 'max-h-[calc(100vh-220px)]'}`}>
        {column.deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDragStart={() => onDragStart(deal.id)}
            onClick={() => onDealClick(deal.id)}
            isDragging={draggedDeal === deal.id}
          />
        ))}
        {column.deals.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">Žádné deals</p>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  pipelineColumns,
  closedColumns,
  onStatusChange,
  onDealClick,
}: KanbanBoardProps) {
  const [draggedDeal, setDraggedDeal] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  const totalClosed = closedColumns.reduce((sum, col) => sum + col.deals.length, 0);

  const handleDragStart = (dealId: string) => {
    setDraggedDeal(dealId);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (status: string) => {
    if (draggedDeal) {
      onStatusChange(draggedDeal, status);
    }
    setDraggedDeal(null);
    setDragOverColumn(null);
  };

  return (
    <div>
      {/* Active Pipeline */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineColumns.map((column) => (
          <Column
            key={column.status}
            column={column}
            draggedDeal={draggedDeal}
            dragOverColumn={dragOverColumn}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDealClick={onDealClick}
          />
        ))}
      </div>

      {/* Archive Section */}
      {totalClosed > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-foreground"
          >
            {showArchive ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Archive className="h-4 w-4" />
            Uzavřené / Archiv
            <span className="rounded-full bg-border px-2 py-0.5 text-xs">
              {totalClosed}
            </span>
          </button>

          {showArchive && (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-4">
              {closedColumns
                .filter((col) => col.deals.length > 0)
                .map((column) => (
                  <Column
                    key={column.status}
                    column={column}
                    draggedDeal={draggedDeal}
                    dragOverColumn={dragOverColumn}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDealClick={onDealClick}
                    compact
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
