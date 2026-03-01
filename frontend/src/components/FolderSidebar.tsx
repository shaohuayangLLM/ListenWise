"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import clsx from "clsx";
import { getFolders, getTags, type Folder, type Tag } from "@/lib/api";

interface FolderSidebarProps {
  selectedFolderId: number | null;
  onSelectFolder: (folderId: number | null) => void;
  totalCount: number;
}

function FolderItem({
  folder,
  depth,
  selectedId,
  onSelect,
}: {
  folder: Folder;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      <button
        onClick={() => onSelect(folder.id)}
        className={clsx(
          "w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13px] transition-all cursor-pointer",
          selectedId === folder.id
            ? "bg-accent-glow text-accent"
            : "text-text-dim hover:bg-surface-2 hover:text-text"
        )}
        style={{ paddingLeft: `${14 + depth * 18}px` }}
      >
        <FolderOpen size={14} className="shrink-0" />
        <span className="flex-1 text-left truncate">{folder.name}</span>
        <span className="text-[11px] font-mono ml-auto">{folder.recording_count}</span>
      </button>
      {folder.children.map((child) => (
        <FolderItem
          key={child.id}
          folder={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export default function FolderSidebar({
  selectedFolderId,
  onSelectFolder,
  totalCount,
}: FolderSidebarProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    getFolders().then(setFolders).catch(() => {});
    getTags().then(setTags).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Folders */}
      <div>
        <div className="text-[13px] font-semibold text-text-dim mb-2 px-1">
          文件夹
        </div>
        <div className="flex flex-col gap-0.5">
          {/* All files */}
          <button
            onClick={() => onSelectFolder(null)}
            className={clsx(
              "w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13px] transition-all cursor-pointer",
              selectedFolderId === null
                ? "bg-accent-glow text-accent"
                : "text-text-dim hover:bg-surface-2 hover:text-text"
            )}
          >
            <FolderOpen size={14} className="shrink-0" />
            <span className="flex-1 text-left">全部文件</span>
            <span className="text-[11px] font-mono">{totalCount}</span>
          </button>

          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              depth={0}
              selectedId={selectedFolderId}
              onSelect={onSelectFolder}
            />
          ))}

          {/* New folder button */}
          <button className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-[13px] text-accent hover:bg-surface-2 transition-all mt-1 cursor-pointer">
            <Plus size={14} />
            新建文件夹
          </button>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <div className="text-[13px] font-semibold text-text-dim mb-2 px-1">
            标签
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-3 py-1 bg-surface-2 border border-border rounded-2xl text-text-dim cursor-pointer hover:border-border-hover transition-colors"
              >
                # {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
