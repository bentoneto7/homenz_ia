CREATE TABLE `clinic_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`dayOfWeek` tinyint NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`slotDurationMinutes` int NOT NULL DEFAULT 60,
	`breakBetweenMinutes` int NOT NULL DEFAULT 0,
	`maxConcurrentAppointments` int NOT NULL DEFAULT 1,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinic_blocked_dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`blockedDate` varchar(10) NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clinic_blocked_dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `googleEventId`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `googleEventLink`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `calComBookingId`;--> statement-breakpoint
ALTER TABLE `appointments` DROP COLUMN `calComBookingUrl`;