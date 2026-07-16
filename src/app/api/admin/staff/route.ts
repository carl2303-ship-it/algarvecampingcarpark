import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
};

function toStaffUser(user: {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}): StaffUser | null {
  if (user.app_metadata?.role !== "admin") return null;
  const name =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
  return {
    id: user.id,
    email: user.email ?? "",
    name,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at ?? null,
    banned: Boolean(user.banned_until && new Date(user.banned_until) > new Date()),
  };
}

async function listAdminUsers() {
  const supabase = createAdminClient();
  const users: StaffUser[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      const staff = toStaffUser(user);
      if (staff) users.push(staff);
    }
    if (data.users.length < perPage) break;
    page += 1;
    if (page > 20) break;
  }

  users.sort((a, b) => a.email.localeCompare(b.email));
  return users;
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users, current_user_id: admin.id });
  } catch (error) {
    console.error("List staff error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
  password: z.string().min(8).max(72).optional(),
});

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const supabase = createAdminClient();

    const metadata = {
      full_name: body.name?.trim() || undefined,
    };

    if (body.password) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: body.password,
        email_confirm: true,
        app_metadata: { role: "admin" },
        user_metadata: metadata,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({
        user: toStaffUser(data.user!),
        invited: false,
      });
    }

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: metadata,
      redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/admin/reset-password")}`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Ensure role is admin (invite may not set app_metadata)
    if (data.user) {
      await supabase.auth.admin.updateUserById(data.user.id, {
        app_metadata: { role: "admin" },
        user_metadata: metadata,
      });
    }

    const { data: refreshed } = await supabase.auth.admin.getUserById(data.user!.id);

    return NextResponse.json({
      user: toStaffUser(refreshed.user!),
      invited: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Create staff error:", error);
    const message = error instanceof Error ? error.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
