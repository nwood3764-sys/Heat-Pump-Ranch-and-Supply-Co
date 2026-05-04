"use client";

import { useState, useEffect, useRef } from "react";
import { FolderPlus, ChevronDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Project } from "@/lib/cart-types";

interface ProjectPickerProps {
  /** Currently selected project ID */
  selectedProjectId: number | null;
  /** Callback when a project is selected */
  onSelect: (projectId: number | null) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Compact mode for inline use (e.g., in product cards) */
  compact?: boolean;
}

export function ProjectPicker({
  selectedProjectId,
  onSelect,
  disabled = false,
  compact = false,
}: ProjectPickerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch projects when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => [data.project, ...prev]);
        onSelect(data.project.id);
        setNewProjectName("");
        setIsCreating(false);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const displayName = selectedProject?.name || "No Project";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center gap-1.5 rounded-md border text-left
          transition-colors hover:bg-muted/50 disabled:opacity-50
          ${compact ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}
          ${selectedProjectId ? "border-primary/30 bg-primary/5" : "border-border"}
        `}
      >
        <FolderPlus className={compact ? "h-3 w-3" : "h-4 w-4"} />
        <span className="truncate max-w-[140px]">{displayName}</span>
        <ChevronDown className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} opacity-50`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border bg-white shadow-lg">
          <div className="p-2">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Assign to Project
            </p>

            {/* No project option */}
            <button
              type="button"
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <div className="h-4 w-4 flex items-center justify-center">
                {selectedProjectId === null && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
              <span className="text-muted-foreground">No Project (default)</span>
            </button>

            {/* Divider */}
            {projects.length > 0 && <div className="my-1 border-t" />}

            {/* Project list */}
            <div className="max-h-48 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    onSelect(project.id);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className="h-4 w-4 flex items-center justify-center">
                    {selectedProjectId === project.id && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-medium">{project.name}</span>
                    {project.itemCount > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        ({project.itemCount} {project.itemCount === 1 ? "item" : "items"})
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="my-1 border-t" />

            {/* Create new project */}
            {isCreating ? (
              <div className="px-2 py-2">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                      if (e.key === "Escape") {
                        setIsCreating(false);
                        setNewProjectName("");
                      }
                    }}
                    placeholder="Project name..."
                    className="h-8 text-sm"
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={handleCreateProject}
                    disabled={isLoading || !newProjectName.trim()}
                  >
                    {isLoading ? "..." : "Add"}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  e.g., &ldquo;Smith Residence&rdquo; or &ldquo;123 Main St Unit 4&rdquo;
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="font-medium">New Project</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
