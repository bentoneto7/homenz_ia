// Ponto de composição do appRouter. Cada domínio vive em ./routers/<dominio>.ts
import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { homenzRouter } from "./routers/homenz";
import { distributionRouter } from "./routers/distribution";
import { stripeRouter } from "./routers/stripe";
import { authRouter } from "./routers/auth";
import { clinicRouter } from "./routers/clinic";
import { leadsRouter } from "./routers/leads";
import { photosRouter } from "./routers/photos";
import { aiRouter } from "./routers/ai";
import { appointmentsRouter } from "./routers/appointments";
import { notificationsRouter } from "./routers/notifications";
import { availabilityRouter } from "./routers/availability";
import { npsRouter } from "./routers/nps";
import { journeyRouter } from "./routers/journey";
import { followupsRouter } from "./routers/followups";
import { healthRouter } from "./routers/health";
import { brandRouter } from "./routers/brand";
import { creatorRouter } from "./routers/creator";
import { inviteRouter } from "./routers/invite";

export const appRouter = router({
  system: systemRouter,
  homenz: homenzRouter,
  distribution: distributionRouter,
  stripe: stripeRouter,
  auth: authRouter,
  clinic: clinicRouter,
  leads: leadsRouter,
  photos: photosRouter,
  ai: aiRouter,
  appointments: appointmentsRouter,
  notifications: notificationsRouter,
  availability: availabilityRouter,
  nps: npsRouter,
  journey: journeyRouter,
  followups: followupsRouter,
  health: healthRouter,
  brand: brandRouter,
  creator: creatorRouter,
  invite: inviteRouter,
});

export type AppRouter = typeof appRouter;
