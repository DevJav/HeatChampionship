import { CalendarDays, Flag, Trophy } from "lucide-react";
import { siteConfig } from "@/config/site";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChequeredStrip,
  Container,
  EmptyState,
  SpeedStripes,
} from "@/components/ui";

export default function HomePage() {
  return (
    <Container className="flex flex-col gap-10">
      <section className="relative overflow-hidden border-l-4 border-primary surface-bar clip-chamfer">
        <SpeedStripes className="absolute inset-y-0 right-0 w-2/3 opacity-90" />
        <div className="relative flex flex-col items-start gap-4 px-6 py-10 sm:px-10 sm:py-14">
          <Badge tone="primary">Liga mensual de carreras</Badge>
          <h1 className="text-6xl sm:text-8xl">{siteConfig.name}</h1>
          <p className="max-w-xl text-bar-fg/80">{siteConfig.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <ButtonLink href="/carreras" variant="accent" size="lg">
              <CalendarDays /> Próximas carreras
            </ButtonLink>
            <ButtonLink href="/clasificacion" variant="inverse" size="lg">
              <Trophy /> Clasificación
            </ButtonLink>
          </div>
        </div>
        <ChequeredStrip className="relative text-bar-fg/80" />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próxima carrera</CardTitle>
          </CardHeader>
          <CardBody>
            <EmptyState
              icon={<Flag />}
              title="No hay carreras programadas"
              description="Cuando se programe una carrera aparecerá aquí con el botón de inscripción."
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clasificación</CardTitle>
          </CardHeader>
          <CardBody>
            <EmptyState
              icon={<Trophy />}
              title="Aún no hay resultados"
              description="La cabeza de la clasificación aparecerá tras la primera carrera."
            />
          </CardBody>
        </Card>
      </div>
    </Container>
  );
}
