CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`coverUrl` text,
	`primaryColor` varchar(7) DEFAULT '#D4A843',
	`website` varchar(255),
	`ownerUserId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `clinic_daily_checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`brandId` int,
	`checkinDate` varchar(10) NOT NULL,
	`submittedByUserId` int NOT NULL,
	`leadsReceivedToday` int NOT NULL DEFAULT 0,
	`leadsContactedToday` int NOT NULL DEFAULT 0,
	`leadsQualifiedToday` int NOT NULL DEFAULT 0,
	`leadsNotQualified` int NOT NULL DEFAULT 0,
	`appointmentsScheduledToday` int NOT NULL DEFAULT 0,
	`appointmentsAttendedToday` int NOT NULL DEFAULT 0,
	`appointmentsNoShowToday` int NOT NULL DEFAULT 0,
	`appointmentsCancelledToday` int NOT NULL DEFAULT 0,
	`leadsWithPhotosToday` int NOT NULL DEFAULT 0,
	`leadsWithAiResultToday` int NOT NULL DEFAULT 0,
	`mainChallengesToday` text,
	`bestLeadToday` text,
	`teamMoodScore` tinyint,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clinic_daily_checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clinic_health_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clinicId` int NOT NULL,
	`brandId` int,
	`scoreDate` varchar(10) NOT NULL,
	`leadsTotal` int NOT NULL DEFAULT 0,
	`leadsWithPhoto` int NOT NULL DEFAULT 0,
	`leadsWithAiResult` int NOT NULL DEFAULT 0,
	`avgLeadScore` decimal(5,2) DEFAULT '0',
	`leadQualityScore` decimal(5,2) DEFAULT '0',
	`leadsScheduled` int NOT NULL DEFAULT 0,
	`schedulingRate` decimal(5,2) DEFAULT '0',
	`schedulingScore` decimal(5,2) DEFAULT '0',
	`appointmentsTotal` int NOT NULL DEFAULT 0,
	`appointmentsAttended` int NOT NULL DEFAULT 0,
	`appointmentsNoShow` int NOT NULL DEFAULT 0,
	`attendanceRate` decimal(5,2) DEFAULT '0',
	`attendanceScore` decimal(5,2) DEFAULT '0',
	`avgResponseTimeMinutes` decimal(8,2) DEFAULT '0',
	`responseScore` decimal(5,2) DEFAULT '0',
	`checkinsThisMonth` int NOT NULL DEFAULT 0,
	`platformUsageDays` int NOT NULL DEFAULT 0,
	`operationalScore` decimal(5,2) DEFAULT '0',
	`totalScore` decimal(5,2) NOT NULL DEFAULT '0',
	`grade` enum('S','A','B','C','D','F') NOT NULL DEFAULT 'F',
	`rankPosition` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clinic_health_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clinics` ADD `brandId` int;--> statement-breakpoint
ALTER TABLE `clinics` ADD `trialActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `clinics` ADD `trialEndsAt` timestamp;