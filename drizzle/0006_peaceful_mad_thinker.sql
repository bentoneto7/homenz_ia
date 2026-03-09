CREATE TABLE `access_invite_uses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inviteId` int NOT NULL,
	`userId` int NOT NULL,
	`usedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_invite_uses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `access_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`createdByUserId` int NOT NULL,
	`role` enum('admin','franchisee','seller') NOT NULL,
	`label` varchar(255),
	`token` varchar(128) NOT NULL,
	`maxUses` int NOT NULL DEFAULT 1,
	`useCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `access_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `access_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','franchisee','seller','owner') NOT NULL DEFAULT 'user';