CREATE TABLE "catalouge" (
	"id"	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	"title"	TEXT NOT NULL UNIQUE,
	"code"	TEXT NOT NULL,
	"price"	INTEGER,
	"standard_id"	INTEGER NOT NULL,
	"section_id"	INTEGER NOT NULL,
	"category_id"	INTEGER NOT NULL,
	"series_id"	INTEGER NOT NULL,
	"remarks"	TEXT
);