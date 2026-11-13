-- Align the original Lab 1 table name with the Prisma model mapping.
DO $$
BEGIN
    IF to_regclass('public."Category"') IS NOT NULL
       AND to_regclass('public.categories') IS NULL THEN
        ALTER TABLE "Category" RENAME TO "categories";
    END IF;

    IF to_regclass('public.categories') IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'Category_pkey'
              AND conrelid = '"categories"'::regclass
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'categories_pkey'
              AND conrelid = '"categories"'::regclass
        ) THEN
            ALTER TABLE "categories"
                RENAME CONSTRAINT "Category_pkey" TO "categories_pkey";
        END IF;

        IF to_regclass('public."Category_name_key"') IS NOT NULL
           AND to_regclass('public.categories_name_key') IS NULL THEN
            ALTER INDEX "Category_name_key" RENAME TO "categories_name_key";
        END IF;
    END IF;
END $$;
