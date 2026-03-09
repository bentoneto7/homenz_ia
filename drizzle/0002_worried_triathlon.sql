CREATE TABLE `lead_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`leadId` int NOT NULL,
	`eventType` enum('lead_created','chat_started','chat_completed','chat_abandoned','photos_started','photos_completed','photos_abandoned','ai_processing_started','ai_result_ready','schedule_opened','appointment_created','appointment_confirmed','appointment_cancelled','appointment_completed','appointment_no_show','followup_sent','whatsapp_contacted','nps_sent','nps_responded','status_changed') NOT NULL,
	`description` text,
	`metadata` json,
	`triggeredBy` enum('system','lead','clinic') NOT NULL DEFAULT 'system',
	`triggeredByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_followups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`leadId` int NOT NULL,
	`sequenceStep` tinyint NOT NULL,
	`channel` enum('whatsapp','platform') NOT NULL DEFAULT 'whatsapp',
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','sent','delivered','failed','cancelled') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`cancelledAt` timestamp,
	`cancelReason` varchar(255),
	`messageText` text,
	`sentByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_followups_id` PRIMARY KEY(`id`)
);
