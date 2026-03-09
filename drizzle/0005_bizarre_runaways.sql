CREATE TABLE `lead_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`leadId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`assignedByUserId` int,
	`status` enum('active','completed','transferred') NOT NULL DEFAULT 'active',
	`firstContactAt` timestamp,
	`responseTimeMinutes` decimal(8,2),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lead_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seller_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`invitedByUserId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255) NOT NULL,
	`token` varchar(128) NOT NULL,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seller_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `seller_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `seller_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`sellerUserId` int NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`leadsAssigned` int NOT NULL DEFAULT 0,
	`leadsContacted` int NOT NULL DEFAULT 0,
	`leadsScheduled` int NOT NULL DEFAULT 0,
	`leadsConverted` int NOT NULL DEFAULT 0,
	`avgResponseTimeMinutes` decimal(8,2) DEFAULT '0',
	`fastestResponseMinutes` decimal(8,2),
	`contactRate` decimal(5,2) DEFAULT '0',
	`schedulingRate` decimal(5,2) DEFAULT '0',
	`conversionRate` decimal(5,2) DEFAULT '0',
	`performanceScore` int NOT NULL DEFAULT 0,
	`rankPosition` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seller_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','franchisee','seller') NOT NULL DEFAULT 'user';