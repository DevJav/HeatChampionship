import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Card, Section, Table, TBody, Td, Th, THead, Tr } from "@/components/ui";
import { AdminSuspense } from "@/components/admin/AdminSuspense";
import { listUsers } from "@/lib/data/users";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Pilotos · Admin" };

async function AdminPlayersPageContent() {
  await requireAdmin("/admin/pilotos");
  const users = await listUsers();

  return (
    <Section title="Pilotos">
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Piloto</Th>
              <Th className="max-sm:hidden">Usuario</Th>
              <Th>Rol</Th>
              <Th align="center">Carreras</Th>
              <Th align="right" className="max-md:hidden">
                Alta
              </Th>
            </tr>
          </THead>
          <TBody>
            {users.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Link
                    href={`/admin/pilotos/${user.id}`}
                    className="flex items-center gap-2 font-semibold hover:text-primary hover:underline"
                  >
                    <Avatar name={user.name} src={user.image} size="sm" />
                    {user.name}
                  </Link>
                </Td>
                <Td className="text-fg-muted max-sm:hidden">@{user.username}</Td>
                <Td>{user.role === "admin" ? <Badge tone="primary">Admin</Badge> : <Badge>Piloto</Badge>}</Td>
                <Td align="center">{user._count.results}</Td>
                <Td align="right" className="text-fg-muted max-md:hidden">
                  {formatDate(user.createdAt)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </Section>
  );
}

export default function AdminPlayersPage() {
  return (
    <AdminSuspense>
      <AdminPlayersPageContent />
    </AdminSuspense>
  );
}
