CREATE TYPE "public"."print_mode" AS ENUM('repeat', 'engineered');--> statement-breakpoint
ALTER TABLE "fabrics" ADD COLUMN "print_mode" "print_mode" DEFAULT 'repeat' NOT NULL;