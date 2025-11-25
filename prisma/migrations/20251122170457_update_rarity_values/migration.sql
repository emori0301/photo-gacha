-- Update rarity values from old to new
UPDATE "Image" SET "rarity" = 'N' WHERE "rarity" = 'COMMON';
UPDATE "Image" SET "rarity" = 'R' WHERE "rarity" = 'UNCOMMON';
UPDATE "Image" SET "rarity" = 'SR' WHERE "rarity" = 'RARE';
UPDATE "Image" SET "rarity" = 'SSR' WHERE "rarity" = 'EPIC';
UPDATE "Image" SET "rarity" = 'UR' WHERE "rarity" = 'LEGENDARY';

