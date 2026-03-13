CREATE TABLE `landing_page_sellers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`landingPageId` varchar(36) NOT NULL,
	`sellerId` varchar(36) NOT NULL,
	`sellerName` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `landing_page_sellers_id` PRIMARY KEY(`id`)
);
