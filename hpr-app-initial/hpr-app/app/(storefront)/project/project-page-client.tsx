"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  FolderPlus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";
import type { CartLineItem, Project } from "@/lib/cart-types";

interface ProjectGroup {
  project: Project | null; // null = unassigned items
  items: CartLineItem[];
  subtotal: number;
}

export function ProjectPageClient() {
  const { cart, updateQuantity, removeItem, moveToProject, isLoading, refreshCart } = useCart();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  // Ensure cart data is loaded when visiting this page directly
  useEffect(() => {
    refreshCart();
    fetchProjects();
  }, [refreshCart]);

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
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) => [data.project, ...prev]);
        setNewProjectName("");
        setIsCreatingProject(false);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    }
  }

  async function handleRenameProject(projectId: number) {
    if (!editName.trim()) return;
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: editName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, ...data.project } : p)),
        );
        setEditingProjectId(null);
        setEditName("");
      }
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
  }

  async function handleDeleteProject(projectId: number) {
    try {
      const res = await fetch(`/api/projects?projectId=${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
        // Refresh cart to reflect unlinked items
        refreshCart();
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  }

  // Group items by project
  const groupedItems: ProjectGroup[] = (() => {
    const groups = new Map<number | null, CartLineItem[]>();

    for (const item of cart.items) {
      const key = item.projectId;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    const result: ProjectGroup[] = [];

    // Named projects first (in order of projects list)
    for (const project of projects) {
      const items = groups.get(project.id) || [];
      if (items.length > 0) {
        result.push({
          project,
          items,
          subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
        });
        groups.delete(project.id);
      }
    }

    // Any remaining project IDs not in our projects list (edge case)
    for (const [key, items] of groups.entries()) {
      if (key !== null) {
        result.push({
          project: { id: key, name: `Project #${key}`, description: null, status: "active", itemCount: items.length, created_at: "", updated_at: "" },
          items,
          subtotal: items.reduce((sum, i) => sum + i.lineTotal, 0),
        });
      }
    }

    // Unassigned items last
    const unassigned = groups.get(null) || [];
    if (unassigned.length > 0) {
      result.push({
        project: null,
        items: unassigned,
        subtotal: unassigned.reduce((sum, i) => sum + i.lineTotal, 0),
      });
    }

    return result;
  })();

  const hasProjects = projects.length > 0;
  const hasMultipleGroups = groupedItems.length > 1;

  return (
    <div className="container py-8">
      <div className="mb-6 text-sm text-muted-foreground flex items-center gap-2">
        <Link href="/catalog" className="hover:text-primary inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Continue Shopping
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">My Projects</h1>
        {!isCreatingProject && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingProject(true)}
            className="gap-1.5"
          >
            <FolderPlus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Create project inline form */}
      {isCreatingProject && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Create a new project</p>
            <div className="flex gap-2">
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProject();
                  if (e.key === "Escape") {
                    setIsCreatingProject(false);
                    setNewProjectName("");
                  }
                }}
                placeholder='e.g., "Smith Residence" or "123 Main St Unit 4"'
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreatingProject(false);
                  setNewProjectName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty projects list (no items in cart at all) */}
      {cart.items.length === 0 && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingCart className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="text-xl font-medium text-muted-foreground">Your projects are empty</p>
          <p className="mt-2 text-sm text-muted-foreground/70 max-w-md">
            Browse our catalog and add equipment, systems, and accessories. Create named projects to organize equipment by job site or property.
          </p>
          <Link href="/catalog" className="mt-6">
            <Button size="lg">Browse Catalog</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project groups */}
          <div className="lg:col-span-2 space-y-8">
            {/* Empty projects (no items yet) */}
            {projects
              .filter((p) => !groupedItems.find((g) => g.project?.id === p.id))
              .map((project) => (
                <div key={`empty-${project.id}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    {editingProjectId === project.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameProject(project.id);
                            if (e.key === "Escape") setEditingProjectId(null);
                          }}
                          className="h-8 text-sm max-w-xs"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={() => handleRenameProject(project.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingProjectId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FolderPlus className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">{project.name}</h2>
                      </div>
                    )}
                    {editingProjectId !== project.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProjectId(project.id);
                            setEditName(project.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No equipment added yet. Browse the catalog to add items to this project.
                  </p>
                </div>
              ))}

            {/* Groups with items */}
            {groupedItems.map((group) => (
              <div key={group.project?.id ?? "unassigned"} className="space-y-4">
                {/* Group header */}
                <div className="flex items-center justify-between border-b pb-3">
                  {group.project ? (
                    <>
                      {editingProjectId === group.project.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameProject(group.project!.id);
                              if (e.key === "Escape") setEditingProjectId(null);
                            }}
                            className="h-8 text-sm max-w-xs"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => handleRenameProject(group.project!.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingProjectId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <FolderPlus className="h-5 w-5 text-primary" />
                          <h2 className="text-lg font-semibold">{group.project.name}</h2>
                          <span className="text-sm text-muted-foreground">
                            ({group.items.length} {group.items.length === 1 ? "item" : "items"})
                          </span>
                        </div>
                      )}
                      {editingProjectId !== group.project.id && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold mr-2">
                            {formatPrice(group.subtotal)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingProjectId(group.project!.id);
                              setEditName(group.project!.name);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteProject(group.project!.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold text-muted-foreground">
                          Unassigned Items
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          ({group.items.length} {group.items.length === 1 ? "item" : "items"})
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatPrice(group.subtotal)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items in this group */}
                {group.items.map((item) => (
                  <Card key={item.cartItemId}>
                    <CardContent className="p-4 flex gap-4">
                      {/* Thumbnail */}
                      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-muted border">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-contain p-1"
                            sizes="96px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            No image
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex flex-1 flex-col min-w-0">
                        <Link
                          href={item.href}
                          className="font-semibold text-sm leading-tight hover:text-primary hover:underline line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.brand} &middot; SKU: {item.sku}
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {formatPrice(item.unitPrice)} each
                        </p>

                        <div className="mt-auto flex items-center justify-between pt-3">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isLoading}
                              onClick={() =>
                                item.quantity <= 1
                                  ? removeItem(item.cartItemId)
                                  : updateQuantity(item.cartItemId, item.quantity - 1)
                              }
                            >
                              {item.quantity <= 1 ? (
                                <Trash2 className="h-3.5 w-3.5" />
                              ) : (
                                <Minus className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <span className="w-10 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isLoading}
                              onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-2 text-destructive hover:text-destructive"
                              disabled={isLoading}
                              onClick={() => removeItem(item.cartItemId)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                          </div>

                          {/* Line total */}
                          <span className="text-base font-bold">
                            {formatPrice(item.lineTotal)}
                          </span>
                        </div>

                        {/* Move to project selector (only show if user has projects) */}
                        {hasProjects && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Move to:</span>
                              <select
                                value={item.projectId ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  moveToProject(
                                    item.cartItemId,
                                    val === "" ? null : parseInt(val),
                                  );
                                }}
                                className="text-xs border rounded px-2 py-1 bg-white"
                                disabled={isLoading}
                              >
                                <option value="">No project</option>
                                {projects.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>

          {/* Order summary sidebar */}
          <div>
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

                {/* Per-project subtotals */}
                {hasMultipleGroups && (
                  <div className="space-y-2 text-sm mb-4">
                    {groupedItems.map((group) => (
                      <div key={group.project?.id ?? "unassigned"} className="flex justify-between">
                        <span className="text-muted-foreground truncate max-w-[160px]">
                          {group.project?.name ?? "Unassigned"}
                        </span>
                        <span>{formatPrice(group.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Items ({cart.itemCount})
                    </span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                </div>

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-base font-bold">
                    <span>Subtotal</span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Pay by bank (ACH) at no extra charge. Credit card payments include a processing fee (2.9% + $0.30).
                </p>

                <Link href="/checkout" className="block mt-4">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>

                <Link href="/catalog" className="block mt-2">
                  <Button variant="outline" className="w-full">
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
