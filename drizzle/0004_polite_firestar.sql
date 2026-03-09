ALTER TABLE `leads` ADD `lastAlertSentAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `lastAlertTemperature` enum('hot','warm','cold','lost');