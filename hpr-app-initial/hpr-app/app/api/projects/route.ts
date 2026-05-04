import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/projects — List all projects for the authenticated user.
 * Returns: { projects: Project[] }
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sc = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ projects: [] });
  }

  const { data: appUser } = await sc
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) {
    return NextResponse.json({ projects: [] });
  }

  const { data: projects } = await sc
    .from("projects")
    .select("id, name, description, status, created_at, updated_at")
    .eq("user_id", appUser.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  // Get item counts per project
  const projectIds = (projects ?? []).map((p: any) => p.id);
  let itemCounts: Record<number, number> = {};

  if (projectIds.length > 0) {
    // Get cart items that belong to this user's cart and have a project_id
    const { data: cartItems } = await sc
      .from("cart_items")
      .select("project_id, quantity")
      .in("project_id", projectIds);

    if (cartItems) {
      for (const item of cartItems) {
        if (item.project_id) {
          itemCounts[item.project_id] = (itemCounts[item.project_id] || 0) + item.quantity;
        }
      }
    }
  }

  const enrichedProjects = (projects ?? []).map((p: any) => ({
    ...p,
    itemCount: itemCounts[p.id] || 0,
  }));

  return NextResponse.json({ projects: enrichedProjects });
}

/**
 * POST /api/projects — Create a new project.
 * Body: { name: string, description?: string }
 * Returns: { project: Project }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const sc = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to create projects" },
      { status: 401 },
    );
  }

  const { data: appUser } = await sc
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 },
    );
  }

  const { data: project, error } = await sc
    .from("projects")
    .insert({
      user_id: appUser.id,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select("id, name, description, status, created_at, updated_at")
    .single();

  if (error) {
    console.error("[projects] Failed to create project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }

  return NextResponse.json({ project: { ...project, itemCount: 0 } });
}

/**
 * PATCH /api/projects — Update a project name/description.
 * Body: { projectId: number, name?: string, description?: string, status?: string }
 * Returns: { project: Project }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const sc = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { data: appUser } = await sc
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 },
    );
  }

  const body = await request.json();
  const { projectId, name, description, status } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  // Verify ownership
  const { data: existing } = await sc
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", appUser.id)
    .single();

  if (!existing) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 },
    );
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name && typeof name === "string" && name.trim().length > 0) {
    updates.name = name.trim();
  }
  if (description !== undefined) {
    updates.description = description?.trim() || null;
  }
  if (status && ["active", "archived", "checked_out"].includes(status)) {
    updates.status = status;
  }

  const { data: project, error } = await sc
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select("id, name, description, status, created_at, updated_at")
    .single();

  if (error) {
    console.error("[projects] Failed to update project:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }

  return NextResponse.json({ project });
}

/**
 * DELETE /api/projects — Delete (archive) a project.
 * Query: ?projectId=123
 */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const sc = createServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { data: appUser } = await sc
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (!appUser) {
    return NextResponse.json(
      { error: "User account not found" },
      { status: 404 },
    );
  }

  // Verify ownership and archive (soft delete)
  const { error } = await sc
    .from("projects")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", parseInt(projectId))
    .eq("user_id", appUser.id);

  if (error) {
    console.error("[projects] Failed to archive project:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }

  // Unlink cart items from this project (they stay in the cart, just unassigned)
  await sc
    .from("cart_items")
    .update({ project_id: null })
    .eq("project_id", parseInt(projectId));

  return NextResponse.json({ success: true });
}
