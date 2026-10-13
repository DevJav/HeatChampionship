import type { Metadata } from "next";
import { Flag, Plus, Trash2, Trophy } from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChequeredStrip,
  Container,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Section,
  Select,
  Skeleton,
  SpeedStripes,
  Spinner,
  StatCard,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  Textarea,
} from "@/components/ui";
import { CarColorChip } from "@/components/domain/CarColorChip";
import { DriverName } from "@/components/domain/DriverName";
import { PositionBadge } from "@/components/domain/PositionBadge";
import { ModalDemo } from "./ModalDemo";

export const metadata: Metadata = { title: "Kit de interfaz" };

/**
 * Living style guide. Every shared component in every variant, so you can
 * tweak src/styles/tokens.css or a component and see the effect at once.
 */

const tokenSwatches = [
  "background",
  "surface",
  "surface-2",
  "border",
  "bar",
  "fg",
  "fg-muted",
  "primary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
  "gold",
  "silver",
  "bronze",
];

const buttonVariantNames = [
  "primary",
  "accent",
  "secondary",
  "ghost",
  "danger",
  "link",
] as const;

const badgeTones = [
  "neutral",
  "primary",
  "accent",
  "success",
  "warning",
  "danger",
  "info",
  "bar",
] as const;

const sampleResults = [
  { pos: 1, name: "Javier", color: { name: "Rojo", hex: "#c8102e" }, pts: 9 },
  { pos: 2, name: "Ana López", color: { name: "Azul", hex: "#1d4ed8" }, pts: 6 },
  { pos: 3, name: "Marco", color: { name: "Amarillo", hex: "#facc15" }, pts: 4 },
  { pos: 4, name: "Lucía", color: { name: "Verde", hex: "#15803d" }, pts: 3 },
  { pos: 5, name: "Sara", color: { name: "Blanco", hex: "#f5f5f4" }, pts: 2 },
  { pos: null, name: "Pablo", color: { name: "Negro", hex: "#1c1917" }, pts: 0 },
];

export default function UiKitPage() {
  return (
    <Container className="flex flex-col gap-12">
      <PageHeader
        eyebrow="Desarrollo"
        title="Kit de interfaz"
        description="Componentes compartidos y tokens de diseño. Edita src/styles/tokens.css para cambiar el estilo."
      />

      <Section title="Colores">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-8">
          {tokenSwatches.map((name) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div
                className="h-12 border border-border"
                style={{ backgroundColor: `var(--${name})` }}
              />
              <code className="text-xs text-fg-muted">--{name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl">Gran Premio</h1>
          <h2 className="text-3xl">Título de sección</h2>
          <h3 className="text-xl">Título de tarjeta</h3>
          <p>Texto normal — el coche entra en la curva a velocidad 7.</p>
          <p className="text-sm text-fg-muted">Texto secundario atenuado.</p>
          <code className="font-mono text-sm">Monoespaciada 0123456789</code>
        </div>
      </Section>

      <Section title="Elementos retro">
        <div className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
          <SpeedStripes className="absolute inset-y-0 right-0 w-1/2" />
          <div className="relative flex items-center gap-3 px-5 py-6">
            <Badge tone="primary">En directo</Badge>
            <span className="font-display text-2xl font-bold uppercase italic">
              Barra de retransmisión
            </span>
            <Button variant="inverse" size="sm">
              Botón inverse
            </Button>
          </div>
          <ChequeredStrip className="relative text-bar-fg/80" />
        </div>
      </Section>

      <Section title="Botones">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {buttonVariantNames.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Pequeño</Button>
            <Button size="md">Mediano</Button>
            <Button size="lg">Grande</Button>
            <Button size="icon" variant="secondary" aria-label="Añadir">
              <Plus />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <Flag /> Con icono
            </Button>
            <Button loading>Guardando</Button>
            <Button disabled>Desactivado</Button>
            <Button variant="danger">
              <Trash2 /> Eliminar
            </Button>
            <ButtonLink href="/" variant="secondary">
              ButtonLink
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section title="Etiquetas">
        <div className="flex flex-wrap gap-2">
          {badgeTones.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Posiciones y colores de coche">
        <div className="flex flex-wrap items-center gap-3">
          {[1, 2, 3, 4, 8].map((p) => (
            <PositionBadge key={p} position={p} />
          ))}
          <PositionBadge position={null} />
          <PositionBadge position={1} size="lg" />
          <PositionBadge position={null} size="lg" />
          <PositionBadge position={5} size="sm" />
          <PositionBadge position={null} size="sm" />
          <PositionBadge position={2} size="sm" neutral />
        </div>
        <div className="flex flex-wrap gap-6">
          {sampleResults.map((r) => (
            <DriverName key={r.name} name={r.name} color={r.color.hex} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {sampleResults.map((r) => (
            <CarColorChip key={r.color.name} {...r.color} />
          ))}
        </div>
      </Section>

      <Section title="Avatares">
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name="Javier Moreno" size="sm" />
          <Avatar name="Ana López" />
          <Avatar name="Marco" color="#1d4ed8" size="lg" />
          <Avatar name="Lucía Pérez" color="#c8102e" size="xl" />
          <Avatar name="Sara" color="#f5f5f4" size="lg" />
          <Avatar name="Amarillo" color="#facc15" size="lg" />
        </div>
      </Section>

      <Section title="Estadísticas">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Victorias" value={3} icon={<Trophy />} hint="Última: Italia" />
          <StatCard label="Podios" value={7} />
          <StatCard label="Posición media" value="2,8" />
          <StatCard label="Puntos" value={54} hint="+9 en la última carrera" />
        </div>
      </Section>

      <Section title="Tarjetas">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Ronda 3 · Italia</CardTitle>
                <CardDescription>14 de noviembre · 3 vueltas</CardDescription>
              </div>
              <Badge tone="success">Abierta</Badge>
            </CardHeader>
            <CardBody className="text-sm text-fg-muted">
              5 de 8 plazas ocupadas.
            </CardBody>
            <CardFooter>
              <Button variant="ghost">Detalles</Button>
              <Button>Inscribirme</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardBody>
              <EmptyState
                icon={<Flag />}
                title="Estado vacío"
                description="Se muestra cuando una lista no tiene nada."
                action={<Button size="sm">Crear</Button>}
                className="border-0 py-6"
              />
            </CardBody>
          </Card>
        </div>
      </Section>

      <Section title="Tabla">
        <Card>
          <Table>
            <THead>
              <tr>
                <Th align="center" className="w-20">
                  Pos.
                </Th>
                <Th>Piloto</Th>
                <Th align="right">Pts</Th>
              </tr>
            </THead>
            <TBody>
              {sampleResults.map((r) => (
                <Tr key={r.name}>
                  <Td align="center">
                    <PositionBadge position={r.pos} size="sm" />
                  </Td>
                  <Td>
                    <DriverName name={r.name} color={r.color.hex} />
                  </Td>
                  <Td align="right" className="font-display text-base font-bold italic">
                    {r.pts}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      </Section>

      <Section title="Formularios">
        <Card>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre visible" htmlFor="demo-name" hint="Aparece en la clasificación">
              <Input id="demo-name" placeholder="Javier" />
            </Field>
            <Field label="Circuito" htmlFor="demo-track">
              <Select id="demo-track" defaultValue="italia">
                <option value="usa">EE. UU.</option>
                <option value="italia">Italia</option>
                <option value="francia">Francia</option>
                <option value="gb">Gran Bretaña</option>
              </Select>
            </Field>
            <Field
              label="Vueltas"
              htmlFor="demo-laps"
              error="Las vueltas deben estar entre 1 y 5"
            >
              <Input id="demo-laps" type="number" defaultValue={9} aria-invalid />
            </Field>
            <Field label="Desactivado" htmlFor="demo-disabled">
              <Input id="demo-disabled" disabled value="Solo lectura" readOnly />
            </Field>
            <Field label="Notas" htmlFor="demo-notes" className="md:col-span-2">
              <Textarea id="demo-notes" placeholder="Algo memorable de la carrera…" />
            </Field>
          </CardBody>
        </Card>
      </Section>

      <Section title="Pestañas">
        <Tabs
          items={[
            { id: "results", label: "Resultados", content: <p>Panel de resultados</p> },
            { id: "grid", label: "Parrilla", content: <p>Panel de parrilla</p> },
            { id: "photos", label: "Fotos", content: <p>Panel de fotos</p> },
          ]}
        />
      </Section>

      <Section title="Avisos">
        <div className="flex flex-col gap-2">
          <Alert tone="info">Las inscripciones cierran el viernes a las 20:00.</Alert>
          <Alert tone="success">Te has inscrito en la Ronda 3.</Alert>
          <Alert tone="warning">Quedan 2 plazas libres.</Alert>
          <Alert tone="danger">Usuario o contraseña incorrectos.</Alert>
        </div>
      </Section>

      <Section title="Feedback">
        <div className="flex flex-wrap items-center gap-6">
          <ModalDemo />
          <Spinner className="text-primary" />
          <div className="flex w-64 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>
    </Container>
  );
}
